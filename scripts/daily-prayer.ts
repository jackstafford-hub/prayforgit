/**
 * Daily Crisis Prayer Pipeline
 * Runs at 07:00 UTC daily via Replit Scheduled Deployment.
 * 1. Fetch top global crisis from GDELT (NewsAPI fallback)
 * 2. Draft interfaith prayer via Claude
 * 3. Source image via Replicate Flux Schnell (Unsplash fallback)
 * 4. Save as pending_approval draft
 * 5. Email jackstaffmail@gmail.com with approve/reject links
 * 6. Log everything to daily_prayer_runs table
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pool, db } from '../server/db.js';
import { prayers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { storage } from '../server/storage.js';
import { sendDailyPrayerApprovalEmail, sendDailyPrayerErrorEmail, sendNoPrayerDraftedEmail } from '../server/emailService.js';

const SITE_URL = process.env.SITE_URL || 'https://prayforchange.org';
const IMAGES_DIR = path.resolve(process.cwd(), 'attached_assets/generated_images');

// ── Types ───────────────────────────────────────────────────────────────────

interface CrisisCandidate {
  title: string;
  summary: string;
  url: string;
  tone: number;
  volume: number;
  score: number;
}

interface DraftedPrayer {
  title: string;
  summary: string;
  body: string;
  slug: string;
  imagePrompt: string;
  imageKeywords: string[];
}

interface ImageResult {
  localPath: string;
  serveUrl: string;
  source: string;
  attribution?: string;
}

// ── GDELT News Fetching ──────────────────────────────────────────────────────

async function fetchFromGDELT(): Promise<CrisisCandidate[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0');

  // Use GDELT crisis-specific theme filters for more targeted results
  const themeFilter = [
    'theme:NATURAL_DISASTER',
    'theme:ARMEDCONFLICT',
    'theme:HUMAN_RIGHTS_ABUSES',
    'theme:KILL',
    'theme:DISPLACED',
    'theme:REFUGEES_MIGRANT',
    'theme:TAX_FAMINE_FOOD',
    'theme:WB_635_HEALTH_GLOBAL_HEALTH_SECURITY',
  ].join(' OR ');

  const query = encodeURIComponent(`(${themeFilter}) sourcelang:english`);

  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}` +
    `&mode=artlist&maxrecords=50&sortby=ToneDesc&format=json` +
    `&startdatetime=${fmt(yesterday)}&enddatetime=${fmt(now)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GDELT responded ${res.status}`);

  const data = await res.json() as {
    articles?: Array<{ title?: string; url?: string; tone?: string; domain?: string; seendate?: string }>
  };
  if (!data.articles?.length) return [];

  // Score = |tone| × volume_proxy (frequency of similar domain/story in batch)
  const articles = data.articles.filter(a => a.title && a.url);
  const domainCounts: Record<string, number> = {};
  for (const a of articles) {
    const domain = a.domain || 'unknown';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }

  // Deduplicate by title prefix (first 6 words), keeping most-negative tone per group
  const seen = new Set<string>();
  const deduped: CrisisCandidate[] = [];
  for (const a of articles) {
    const tone = parseFloat(a.tone ?? '0');
    const negativeTone = Math.min(tone, 0);
    // Skip articles with tone better than -1 (not genuinely crisis-level)
    if (negativeTone > -1) continue;

    const titleKey = a.title!.split(' ').slice(0, 6).join(' ').toLowerCase();
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);

    const domain = a.domain || 'unknown';
    const volume = domainCounts[domain] || 1;
    deduped.push({
      title: a.title!,
      summary: '',
      url: a.url!,
      tone,
      volume,
      score: Math.abs(tone) * volume,
    });
  }

  return deduped.slice(0, 15);
}

async function fetchFromNewsAPI(): Promise<CrisisCandidate[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new Error('NEWSAPI_KEY not set');

  const keywords = 'crisis OR disaster OR war OR humanitarian OR refugees OR famine OR earthquake OR flood';
  const url = `https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(keywords)}&language=en&pageSize=10&apiKey=${key}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`NewsAPI responded ${res.status}`);

  const data = await res.json() as { articles?: Array<{ title?: string; description?: string; url?: string }> };
  if (!data.articles?.length) return [];

  return data.articles
    .filter(a => a.title && a.url)
    .map(a => ({
      title: a.title!,
      summary: a.description || '',
      url: a.url!,
      tone: -5,
      volume: 1,
      score: 5,
    }));
}

async function fetchTopCrisis(recentCrises: string[]): Promise<CrisisCandidate | null> {
  let candidates: CrisisCandidate[] = [];

  let gdeltError: string | null = null;
  try {
    candidates = await fetchFromGDELT();
    console.log(`[GDELT] Retrieved ${candidates.length} articles`);
  } catch (err: any) {
    gdeltError = err.message;
    console.warn('[GDELT] Failed, trying NewsAPI fallback:', gdeltError);
    try {
      candidates = await fetchFromNewsAPI();
      console.log(`[NewsAPI] Retrieved ${candidates.length} articles`);
    } catch (err2: any) {
      // Both news sources failed — this is an infrastructure outage, not a normal "no crisis" day
      throw new Error(`News fetch failed — GDELT: ${gdeltError}; NewsAPI: ${err2.message}`);
    }
  }

  // Genuine case: sources responded but no articles passed our quality/crisis filters
  if (!candidates.length) return null;

  const DEDUP_THRESHOLD = 0.4;
  const recentLower = recentCrises.map(c => c.toLowerCase());

  const novel = candidates.filter(c => {
    const titleLower = c.title.toLowerCase();
    return !recentLower.some(recent => {
      const recentWords = recent.split(/\s+/).filter(w => w.length > 5);
      const matchCount = recentWords.filter(w => titleLower.includes(w)).length;
      return recentWords.length > 0 && matchCount / recentWords.length > DEDUP_THRESHOLD;
    });
  });

  const pool = novel.length > 0 ? novel : candidates;
  pool.sort((a, b) => b.score - a.score);
  return pool[0];
}

// ── Claude Prayer Drafting ───────────────────────────────────────────────────

async function draftPrayer(crisis: CrisisCandidate): Promise<DraftedPrayer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const system = `You write short, interfaith, politically neutral prayers for PrayForChange.org.

Constraints:
- 80-120 words
- First-person plural ("we pray," "may we")
- Interfaith: no mention of Jesus, Allah, Krishna, etc. Use "God" or "Source of Life" or no addressee
- Politically neutral: no blame, no policy, no sides
- Lament + hope + action in that order
- No rhyming. No archaic language
- End with "Amen."

Also return:
- title: a short, clear prayer card title (6-10 words, does NOT start with "A Prayer for")
- summary: a one-line summary (max 18 words) for the card/widget
- slug: URL slug (lowercase, hyphenated, no stopwords, max 60 chars)
- imagePrompt: 1 sentence describing a symbolic, hopeful image — no faces, no text, no logos
- imageKeywords: 5-keyword array for image-search fallback

Return ONLY valid JSON with keys: title, summary, body, slug, imagePrompt, imageKeywords`;

  const userMsg = `News headline: "${crisis.title}"${crisis.summary ? `\n\nBrief summary: ${crisis.summary}` : ''}

Write an interfaith prayer for this crisis.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json() as { content?: Array<{ type: string; text: string }> };
  const text = data.content?.find(c => c.type === 'text')?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude did not return JSON. Response: ${text.slice(0, 200)}`);

  const parsed = JSON.parse(jsonMatch[0]) as DraftedPrayer;
  if (!parsed.title || !parsed.body) throw new Error('Claude JSON missing required fields');

  return parsed;
}

// ── Image Sourcing ───────────────────────────────────────────────────────────

async function downloadImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

async function sourceImageFromReplicate(imagePrompt: string): Promise<ImageResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not set');

  const createRes = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Prefer': 'wait',
      },
      body: JSON.stringify({ input: { prompt: imagePrompt, num_outputs: 1 } }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => '');
    throw new Error(`Replicate create error ${createRes.status}: ${body}`);
  }

  const prediction = await createRes.json() as { id: string; status: string; output?: string[] | null; error?: string };

  let result = prediction;
  let attempts = 0;
  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!pollRes.ok) throw new Error(`Replicate poll error ${pollRes.status}`);
    result = await pollRes.json() as typeof result;
    attempts++;
  }

  if (result.status !== 'succeeded' || !result.output?.[0]) {
    throw new Error(`Replicate generation failed: status=${result.status} error=${result.error || 'unknown'}`);
  }

  const imageUrl = result.output[0];
  const imageBuffer = await downloadImage(imageUrl);

  const filename = `daily-prayer-${new Date().toISOString().split('T')[0]}-${randomBytes(4).toString('hex')}.webp`;
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const localPath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(localPath, imageBuffer);

  return { localPath, serveUrl: `/assets/${filename}`, source: 'replicate' };
}

async function sourceImageFromUnsplash(keywords: string[]): Promise<ImageResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY not set');

  const query = keywords.slice(0, 3).join(' ');
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${key}`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Unsplash error ${res.status}`);

  const data = await res.json() as { results?: Array<{ urls?: { regular?: string }; user?: { name?: string }; links?: { html?: string } }> };
  const photo = data.results?.[0];
  if (!photo?.urls?.regular) throw new Error('No Unsplash photo found');

  const imageUrl = photo.urls.regular;
  const imageBuffer = await downloadImage(imageUrl);

  const attribution = photo.user?.name
    ? `Photo by ${photo.user.name} on Unsplash`
    : 'Photo from Unsplash';

  const filename = `daily-prayer-${new Date().toISOString().split('T')[0]}-${randomBytes(4).toString('hex')}.jpg`;
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const localPath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(localPath, imageBuffer);

  return { localPath, serveUrl: `/assets/${filename}`, source: 'unsplash', attribution };
}

async function sourceImage(imagePrompt: string, imageKeywords: string[]): Promise<ImageResult | null> {
  try {
    return await sourceImageFromReplicate(imagePrompt);
  } catch (err: any) {
    console.warn('[IMAGE] Replicate failed, trying Unsplash:', err.message);
    try {
      return await sourceImageFromUnsplash(imageKeywords);
    } catch (err2: any) {
      console.warn('[IMAGE] Unsplash also failed:', err2.message);
      return null;
    }
  }
}

// ── Slug deduplication helper ────────────────────────────────────────────────

function generateBaseSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'daily-crisis-prayer';
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

async function run() {
  console.log('[DAILY-PRAYER] Pipeline starting at', new Date().toISOString());

  let runLog = await storage.logDailyPrayerRun({});

  try {
    // Step 1: Fetch top crisis
    console.log('[STEP 1] Fetching top crisis news...');
    const recentCrises = await storage.getRecentDailyCrisisPrayers(14);
    const crisis = await fetchTopCrisis(recentCrises);

    if (!crisis) {
      console.log('[STEP 1] No suitable crisis found — sending no-prayer email');
      await sendNoPrayerDraftedEmail();
      await storage.updateDailyPrayerRun(runLog.id, { error: 'no_crisis_found' });
      return;
    }

    console.log(`[STEP 1] Selected crisis: "${crisis.title}" (score=${crisis.score.toFixed(2)})`);
    await storage.updateDailyPrayerRun(runLog.id, { crisisChosen: crisis.title });

    // Step 2: Draft prayer via Claude
    console.log('[STEP 2] Drafting prayer via Claude...');
    const llmStart = Date.now();
    const draft = await draftPrayer(crisis);
    const llmLatencyMs = Date.now() - llmStart;
    console.log(`[STEP 2] Prayer drafted: "${draft.title}" (${llmLatencyMs}ms)`);
    await storage.updateDailyPrayerRun(runLog.id, { llmLatencyMs });

    // Step 3: Source image
    console.log('[STEP 3] Sourcing image...');
    const imageStart = Date.now();
    const imageResult = await sourceImage(draft.imagePrompt, draft.imageKeywords);
    const imageLatencyMs = Date.now() - imageStart;
    const imageSource = imageResult?.source ?? 'none';
    console.log(`[STEP 3] Image sourced from ${imageSource} (${imageLatencyMs}ms)`);
    await storage.updateDailyPrayerRun(runLog.id, { imageSource, imageLatencyMs });

    // Step 4: Save as pending_approval draft
    console.log('[STEP 4] Saving prayer draft to database...');
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const descriptionParts = [crisis.summary || crisis.title];
    if (imageResult?.attribution) descriptionParts.push(`\n\n${imageResult.attribution}`);
    const description = descriptionParts.join('');

    const slug = generateBaseSlug(draft.slug || draft.title);

    const createdPrayer = await storage.createPrayer({
      title: draft.title,
      description,
      aiSummary: draft.summary,
      recitablePrayer: draft.body,
      imageUrl: imageResult?.serveUrl ?? null,
      author: 'Daily Crisis Prayer',
      count: 1,
      goal: 100,
      topic: 'World Peace',
      flaggedForReview: false,
    });

    await db
      .update(prayers)
      .set({ isDailyCrisisPrayer: true, createdByEmail: 'system@prayforchange.org' })
      .where(eq(prayers.id, createdPrayer.id));

    const pendingPrayer = await storage.setPrayerPendingApproval(createdPrayer.id, token, expiry);

    await storage.updateDailyPrayerRun(runLog.id, { draftId: pendingPrayer.id });

    console.log(`[STEP 4] Draft saved as prayer ID: ${pendingPrayer.id}`);

    // Step 5: Send approval email
    console.log('[STEP 5] Sending approval email...');
    const approveUrl = `${SITE_URL}/api/prayers/${pendingPrayer.id}/approve?token=${token}`;
    const rejectUrl = `${SITE_URL}/api/prayers/${pendingPrayer.id}/reject?token=${token}`;

    await sendDailyPrayerApprovalEmail(pendingPrayer, approveUrl, rejectUrl);
    const emailSentAt = new Date();
    await storage.updateDailyPrayerRun(runLog.id, { emailSentAt });

    console.log('[DAILY-PRAYER] Pipeline completed successfully at', new Date().toISOString());

  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error('[DAILY-PRAYER] Pipeline failed:', errorMessage);
    await storage.updateDailyPrayerRun(runLog.id, { error: errorMessage });
    await sendDailyPrayerErrorEmail(errorMessage, 'pipeline');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run().catch(async (err) => {
  console.error('[DAILY-PRAYER] Unhandled error:', err);
  try {
    await sendDailyPrayerErrorEmail(err?.message || String(err), 'unhandled');
  } catch {}
  await pool.end().catch(() => {});
  process.exit(1);
});
