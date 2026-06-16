/**
 * Daily Crisis Prayer Pipeline
 * Runs at 07:00 UTC daily via Replit Scheduled Deployment.
 * 1. Fetch top global crisis from GDELT (NewsAPI fallback)
 * 2. Validate story tier against multi-market news outlet RSS feeds
 * 3. Draft interfaith prayer via Claude
 * 4. Source image via Replicate Flux Schnell (Unsplash fallback)
 * 5. Save as pending_approval draft
 * 6. Email jackstaffmail@gmail.com with approve/reject links
 * 7. Log everything to daily_prayer_runs table
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { pool } from '../server/db.js';
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

interface TierResult {
  tier: 1 | 2 | 3;
  confirmedOutlets: string[];
}

interface FetchCrisisResult {
  crisis: CrisisCandidate;
  tierResult: TierResult;
}

// ── Multi-Market Validation ──────────────────────────────────────────────────

const OUTLET_GROUPS: Array<{ name: string; group: string; rssUrl: string }> = [
  { name: 'Reuters', group: 'Wire', rssUrl: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'BBC', group: 'UK', rssUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'The Guardian', group: 'UK', rssUrl: 'https://www.theguardian.com/world/rss' },
  { name: 'NPR', group: 'US', rssUrl: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'ABC Australia', group: 'AsiaPacific', rssUrl: 'https://www.abc.net.au/news/feed/10719014/rss.xml' },
];

const STOPWORDS = new Set([
  'about', 'after', 'amid', 'also', 'again', 'being', 'could', 'during', 'every',
  'first', 'found', 'given', 'going', 'have', 'here', 'just', 'like', 'made',
  'make', 'more', 'most', 'need', 'only', 'over', 'said', 'some', 'such', 'than',
  'that', 'their', 'them', 'then', 'there', 'this', 'those', 'through', 'under',
  'upon', 'used', 'very', 'what', 'when', 'where', 'which', 'while', 'will',
  'with', 'would', 'your', 'says', 'from', 'into', 'were', 'they', 'killed',
  'dead', 'people', 'world', 'news', 'year', 'years', 'days',
]);

async function fetchRssTitles(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi) || [];
    return matches.slice(1).map(m =>
      m.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
    );
  } catch {
    return [];
  }
}

function storyMatchesHeadlines(storyTitle: string, headlines: string[]): boolean {
  const keywords = storyTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOPWORDS.has(w));

  if (keywords.length === 0) return false;
  const headlinesText = headlines.join(' ').toLowerCase();
  const matchCount = keywords.filter(kw => headlinesText.includes(kw)).length;
  return matchCount / keywords.length >= 0.25;
}

async function validateStoryTier(story: CrisisCandidate): Promise<TierResult> {
  const results = await Promise.allSettled(
    OUTLET_GROUPS.map(async outlet => {
      const titles = await fetchRssTitles(outlet.rssUrl);
      const matches = storyMatchesHeadlines(story.title, titles);
      return { outlet, matches };
    })
  );

  const confirmedOutlets: string[] = [];
  const confirmedGroups = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.matches) {
      confirmedOutlets.push(result.value.outlet.name);
      confirmedGroups.add(result.value.outlet.group);
    }
  }

  let tier: 1 | 2 | 3;
  if (confirmedGroups.size >= 3) tier = 1;
  else if (confirmedGroups.size >= 2) tier = 2;
  else tier = 3;

  return { tier, confirmedOutlets };
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

  const articles = data.articles.filter(a => a.title && a.url);
  const domainCounts: Record<string, number> = {};
  for (const a of articles) {
    const domain = a.domain || 'unknown';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }

  const seen = new Set<string>();
  const deduped: CrisisCandidate[] = [];
  for (const a of articles) {
    const tone = parseFloat(a.tone ?? '0');
    const negativeTone = Math.min(tone, 0);
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

async function fetchTopCrisis(recentCrises: string[]): Promise<FetchCrisisResult | null> {
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
      throw new Error(`News fetch failed — GDELT: ${gdeltError}; NewsAPI: ${err2.message}`);
    }
  }

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

  // Try each candidate until we find one that's Tier 1 or Tier 2
  let chosenCrisis: CrisisCandidate | null = null;
  let tierResult: TierResult = { tier: 3, confirmedOutlets: [] };

  for (const candidate of pool) {
    const t = await validateStoryTier(candidate);
    console.log(`[VALIDATION] "${candidate.title.slice(0, 70)}" → Tier ${t.tier}, outlets: ${t.confirmedOutlets.join(', ') || 'none'}`);
    if (t.tier < 3) {
      chosenCrisis = candidate;
      tierResult = t;
      break;
    }
  }

  // Fall back to top-scored candidate if none passed Tier 1/2
  if (!chosenCrisis) {
    console.warn('[VALIDATION] No candidate reached Tier 1/2 — using top scored candidate at Tier 3');
    chosenCrisis = pool[0];
    // Re-run validation just to record the outlets for the run log
    tierResult = await validateStoryTier(chosenCrisis);
    tierResult = { ...tierResult, tier: 3 };
  }

  return { crisis: chosenCrisis, tierResult };
}

// ── Claude Prayer Drafting ───────────────────────────────────────────────────

async function draftPrayer(crisis: CrisisCandidate): Promise<DraftedPrayer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const system = `You write beautiful, poetic, interfaith prayers for PrayForChange.org.

Style:
- Elevated, reverent language — use "Thy", "thee", "thy" naturally throughout
- Open with a direct, heartfelt address to God using an elevated title, e.g. "Oh Mighty God, Creator of Life" or "Oh Divine Source of All Being" — vary the title each time
- Structure in 3–4 short stanzas with line breaks, like verse
- Use the channel/conduit metaphor: we ask to be used as vessels or channels for divine power, healing, or love to flow through us to those in need
- Imagery should be vivid and warm: streams of light, radiant energy, flowing love, wondrous power
- Weave together acknowledgement of suffering, a call for divine power to flow, and gratitude for the opportunity to serve
- Close with "May Thy Will be Done." (not "Amen")
- First-person plural ("we pray," "may we," "we ask")
- Politically neutral: no blame, no policy, no sides
- Interfaith: no mention of Jesus, Allah, Krishna, etc. Address only as God, Divine Creator, Divine Father, Source of All Life, or similar universal titles
- 100–140 words

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

// ── Core Pipeline (exported for in-process invocation) ───────────────────────

export async function runPipeline(): Promise<void> {
  console.log('[DAILY-PRAYER] Pipeline starting at', new Date().toISOString());

  let runLog = await storage.logDailyPrayerRun({});

  try {
    // Step 1: Fetch top crisis + validate tier
    console.log('[STEP 1] Fetching top crisis news...');
    const recentCrises = await storage.getRecentDailyCrisisPrayers(14);
    const fetchResult = await fetchTopCrisis(recentCrises);

    if (!fetchResult) {
      console.log('[STEP 1] No suitable crisis found — sending no-prayer email');
      await sendNoPrayerDraftedEmail();
      await storage.updateDailyPrayerRun(runLog.id, { error: 'no_crisis_found' });
      return;
    }

    const { crisis, tierResult } = fetchResult;

    console.log(`[STEP 1] Selected crisis: "${crisis.title}" (score=${crisis.score.toFixed(2)}, tier=${tierResult.tier}, outlets: ${tierResult.confirmedOutlets.join(', ') || 'none'})`);
    await storage.updateDailyPrayerRun(runLog.id, {
      crisisChosen: crisis.title,
      tier: tierResult.tier,
      confirmedOutlets: tierResult.confirmedOutlets,
    });

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

    const crisisSeedCount = Math.floor(Math.random() * (6505 - 2303 + 1)) + 2303;

    const createdPrayer = await storage.createPrayer({
      title: draft.title,
      description,
      aiSummary: draft.summary,
      recitablePrayer: draft.body,
      imageUrl: imageResult?.serveUrl ?? null,
      author: 'Daily Crisis Prayer',
      count: crisisSeedCount,
      goal: 10000,
      topic: 'World Peace',
      flaggedForReview: false,
      isDailyCrisisPrayer: true,
    });

    const pendingPrayer = await storage.setPrayerPendingApproval(createdPrayer.id, token, expiry);

    await storage.updateDailyPrayerRun(runLog.id, { draftId: pendingPrayer.id });

    console.log(`[STEP 4] Draft saved as prayer ID: ${pendingPrayer.id}`);

    // Step 5: Send approval email
    console.log('[STEP 5] Sending approval email...');
    const approveUrl = `${SITE_URL}/api/prayers/${pendingPrayer.id}/approve?token=${token}`;
    const rejectUrl = `${SITE_URL}/api/prayers/${pendingPrayer.id}/reject?token=${token}`;

    await sendDailyPrayerApprovalEmail(pendingPrayer, approveUrl, rejectUrl, tierResult);
    const emailSentAt = new Date();
    await storage.updateDailyPrayerRun(runLog.id, { emailSentAt });

    console.log('[DAILY-PRAYER] Pipeline completed successfully at', new Date().toISOString());

  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error('[DAILY-PRAYER] Pipeline failed:', errorMessage);
    await storage.updateDailyPrayerRun(runLog.id, { error: errorMessage });
    await sendDailyPrayerErrorEmail(errorMessage, 'pipeline');
    process.exitCode = 1;
  }
}

// ── Standalone entry point (cron / npx tsx scripts/daily-prayer.ts) ──────────

async function runStandalone() {
  try {
    await runPipeline();
  } catch (err: any) {
    console.error('[DAILY-PRAYER] Unhandled error:', err);
    try {
      await sendDailyPrayerErrorEmail(err?.message || String(err), 'unhandled');
    } catch {}
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

// Only auto-execute when run directly as a script
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith('/scripts/daily-prayer.ts') || process.argv[1]?.endsWith('/scripts/daily-prayer.js')) {
  runStandalone();
}
