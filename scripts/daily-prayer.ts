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

// In dev (Replit workspace), use the proxied dev domain so approve links work without deploying
const SITE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : (process.env.SITE_URL || 'https://prayforchange.org');
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
  description: string;
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

export interface PipelineResult {
  status: 'success' | 'no_crisis' | 'error';
  crisisTitle?: string;
  tier?: number;
  confirmedOutlets?: string[];
  prayerTitle?: string;
  prayerId?: string;
  approveUrl?: string;
  rejectUrl?: string;
  error?: string;
}

interface FetchCrisisResult {
  crisis: CrisisCandidate;
  tierResult: TierResult;
}

// ── Multi-Market Validation ──────────────────────────────────────────────────

// group: 'Wire' | 'US' | 'UK' | 'AsiaPacific' | 'UN'
// Tier 1 = confirmed in 3+ of the 4 regional groups (Wire, US, UK, AsiaPacific)
// Tier 2 = confirmed in 2+ Wire/UN outlets
// Tier 3 = anything less
const OUTLET_GROUPS: Array<{ name: string; group: string; rssUrl: string }> = [
  // Wire
  { name: 'Reuters', group: 'Wire', rssUrl: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'AP', group: 'Wire', rssUrl: 'https://apnews.com/hub/world-news' },
  // UK
  { name: 'BBC', group: 'UK', rssUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'The Guardian', group: 'UK', rssUrl: 'https://www.theguardian.com/world/rss' },
  // US
  { name: 'NPR', group: 'US', rssUrl: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'CNN', group: 'US', rssUrl: 'https://rss.cnn.com/rss/edition_world.rss' },
  // Asia-Pacific
  { name: 'ABC Australia', group: 'AsiaPacific', rssUrl: 'https://www.abc.net.au/news/feed/10719014/rss.xml' },
  { name: 'CNA', group: 'AsiaPacific', rssUrl: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511' },
  // UN agencies (contribute to Tier 2 wire/UN count, not to the 4 regional groups)
  { name: 'UN News', group: 'UN', rssUrl: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
  { name: 'WHO', group: 'UN', rssUrl: 'https://www.who.int/rss-feeds/news-english.xml' },
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
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrayForChange/1.0)' },
    });
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
  const confirmedRegionalGroups = new Set<string>(); // Wire | US | UK | AsiaPacific
  let wireUNConfirmedCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.matches) {
      const { outlet } = result.value;
      confirmedOutlets.push(outlet.name);
      if (outlet.group !== 'UN') {
        confirmedRegionalGroups.add(outlet.group);
      }
      if (outlet.group === 'Wire' || outlet.group === 'UN') {
        wireUNConfirmedCount++;
      }
    }
  }

  let tier: 1 | 2 | 3;
  if (confirmedRegionalGroups.size >= 3) {
    tier = 1;
  } else if (wireUNConfirmedCount >= 2) {
    tier = 2;
  } else {
    tier = 3;
  }

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

  // OR-operator query restricted to approved wire/broadcast domains
  const q = 'earthquake OR flood OR hurricane OR famine OR refugees OR "humanitarian crisis" OR "mass casualty" OR "disease outbreak" OR wildfire OR "armed conflict"';
  const domains = 'reuters.com,apnews.com,bbc.com,theguardian.com,npr.org,cnn.com,abc.net.au,channelnewsasia.com,un.org,who.int';
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&domains=${domains}&language=en&pageSize=20&sortBy=publishedAt&apiKey=${key}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NewsAPI responded ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    status?: string;
    articles?: Array<{ title?: string; description?: string; url?: string; source?: { name?: string } }>
  };
  if (data.status !== 'ok' || !data.articles?.length) return [];

  const CRISIS_TERMS = ['earthquake', 'flood', 'hurricane', 'typhoon', 'wildfire', 'famine',
    'refugee', 'humanitarian', 'casualty', 'killed', 'dead', 'displaced', 'outbreak',
    'disaster', 'crisis', 'war', 'conflict', 'airstrike', 'attack', 'drought', 'cyclone'];

  return data.articles
    .filter(a => {
      if (!a.title || !a.url || a.title.includes('[Removed]')) return false;
      const text = (a.title + ' ' + (a.description || '')).toLowerCase();
      return CRISIS_TERMS.some(t => text.includes(t));
    })
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
    // Retry once after a short wait (handles transient 429s)
    if (gdeltError?.includes('429')) {
      console.warn('[GDELT] Rate limited — waiting 20s before retry...');
      await new Promise(r => setTimeout(r, 20000));
      try {
        candidates = await fetchFromGDELT();
        console.log(`[GDELT] Retry succeeded — ${candidates.length} articles`);
        gdeltError = null;
      } catch (retryErr: any) {
        gdeltError = retryErr.message;
        console.warn('[GDELT] Retry also failed:', gdeltError);
      }
    }
    if (gdeltError) {
      console.warn('[GDELT] Falling back to NewsAPI:', gdeltError);
      try {
        candidates = await fetchFromNewsAPI();
        console.log(`[NewsAPI] Retrieved ${candidates.length} articles`);
      } catch (err2: any) {
        throw new Error(`News fetch failed — GDELT: ${gdeltError}; NewsAPI: ${err2.message}`);
      }
    }
  }

  // Also fall back to NewsAPI when GDELT returns 0 results (not just on error)
  if (!candidates.length) {
    console.warn('[GDELT] Returned 0 articles — falling back to NewsAPI');
    try {
      candidates = await fetchFromNewsAPI();
      console.log(`[NewsAPI] Retrieved ${candidates.length} articles`);
    } catch (err2: any) {
      console.warn('[NewsAPI] Also failed:', err2.message);
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

  const candidatePool = novel.length > 0 ? novel : candidates;
  candidatePool.sort((a, b) => b.score - a.score);

  // Try candidates in score order; pick first one that reaches Tier 1 or 2
  let chosenCrisis: CrisisCandidate | null = null;
  let tierResult: TierResult = { tier: 3, confirmedOutlets: [] };

  for (const candidate of candidatePool) {
    const t = await validateStoryTier(candidate);
    console.log(`[VALIDATION] "${candidate.title.slice(0, 70)}" → Tier ${t.tier}, outlets: ${t.confirmedOutlets.join(', ') || 'none'}`);
    if (t.tier < 3) {
      chosenCrisis = candidate;
      tierResult = t;
      break;
    }
  }

  // Fallback: use the top-scored candidate even if Tier 3
  if (!chosenCrisis) {
    console.warn('[VALIDATION] No candidate reached Tier 1/2 — using top scored candidate at Tier 3');
    chosenCrisis = candidatePool[0];
    // Re-run just to get confirmed outlets for logging; force tier 3
    const fallbackTier = await validateStoryTier(chosenCrisis);
    tierResult = { ...fallbackTier, tier: 3 };
  }

  return { crisis: chosenCrisis, tierResult };
}

// ── Claude Prayer Drafting ───────────────────────────────────────────────────

async function draftPrayer(crisis: CrisisCandidate): Promise<DraftedPrayer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const system = `You write beautiful, poetic, interfaith prayers for PrayForChange.org. You also write the story that accompanies the prayer.

════════════════════════════
CORE PRAYER RULES — follow every one of these
════════════════════════════

1. HEALING FIRST, CONTEXT SECOND. Petitions must centre on the primary suffering — recovery of the sick, end of the outbreak, safety of those in danger. Secondary themes (stigma, fear, misinformation) may appear at most once, briefly, always pivoting immediately to the positive ("may truth and understanding prevail"). Never dwell on the negative.

2. POSITIVE VISUALISATION THROUGHOUT. The prayer must embody the instruction "picture the situation already healed and whole." Name the affliction once, early, then speak only in terms of the desired outcome: healing, wholeness, strength, recovery, protection, peace. A reader skimming only the petitions should sense light and healing, not fear and shadow.

3. RATIO RULE. At least 70% of lines must be affirmative petitions or visualisations of the healed outcome. No more than 2 lines total may reference negative conditions, and each must pivot to the positive within the same line or the very next line.

4. INCLUDE THE SICK DIRECTLY. For health crises: explicitly pray for the recovery of those currently ill and for the outbreak to end. For disasters: explicitly pray for the safe return home of the displaced and the rebuilding of what was lost. Do not only address the bereaved, the isolated, or the responders.

5. UPLIFTED OPENING. Do not open on heaviness ("hearts heavy," "shadow spreads," "darkness"). Open by invoking Divine healing power, light, or love flowing toward the people and place.

6. PRAYER LANGUAGE ONLY. Never use news-report vocabulary inside the prayer body (misinformation, stigma, crisis, containment, casualty, conflict). That language belongs only in "The Issue" story section. Inside the prayer, use devotional and timeless language: light, healing, mercy, strength, truth, wholeness, compassion, divine energy.

7. KEEP THE CLOSING THANKSGIVING as written: "We thank Thee, Oh [elevated title], / For allowing us to be channels / For Thy Divine Power and Love to flow out into our world." End with: "May Thy Will always and forever be done."

════════════════════════════
PRAYER STRUCTURE
════════════════════════════

Structure: 4–5 stanzas, each separated by a blank line. Each stanza is 4–6 lines of verse (not prose). Total: 200–260 words.

Stanza 1 — Uplifted Address
Open with "Oh [elevated title for God], [poetic descriptor]," — vary every time (e.g. "Oh Mighty God, Creator of all Life," / "Oh Wondrous Source of all Being," / "Oh Divine Father, Light of the Universe,"). Immediately invoke divine healing power flowing to the people and place. Name the location and the situation briefly — one or two lines only — then move straight into petition.

Stanza 2 — Prayer for the Suffering (healing-centred)
"May Thy radiant Light / Divine Energy / boundless Love flow into every..." — name specific people: the sick, the injured, the displaced, children, mothers, the elderly. Speak their healing, their recovery, their strength — as if already granted.

Stanza 3 — Prayer for the Helpers
"Oh [elevated title], may Thy [quality] guide all those who bring aid —" name helpers: health workers, volunteers, emergency responders. Ask that their hands be steady, their hearts courageous, their efforts fruitful.

Stanza 4 — Prayer for Humanity's Awakening
Ask that the world's conscience stir — that people respond with love, solidarity, and generosity. Vision: the situation already turning toward wholeness.

Stanza 5 — Gratitude & Closing (keep this every time)
"We thank Thee, Oh [elevated title], / For allowing us to be channels / For Thy Divine Power and Love to flow out into our world." Close: "May Thy Will always and forever be done."

Additional style rules:
- Use "Thee", "Thy", "Thou" throughout — never "you" or "your"
- First-person plural: "we pray", "may we", "we ask", "we open our hearts"
- Politically neutral: no blame, no policy, no sides
- Interfaith: universal titles only — never Jesus, Allah, Krishna, Christ, etc.
- Vivid imagery: radiant light, boundless love, divine energy, streams of compassion, wondrous power
- Line breaks within stanzas — each line is a breath, not a full sentence

════════════════════════════
STYLE EXAMPLE — match this tone and register
════════════════════════════

Oh Divine Healer, Source of All Compassion,
We invoke Thy radiant healing Light
Upon the people of Uganda and the Democratic Republic of the Congo.
May Thy Power flow now to every soul touched by this sickness,
Restoring body, mind, and spirit to wholeness.
May those who lie ill feel Thy healing Presence,
Their strength renewed, their recovery swift and complete.
May this outbreak be brought to an end,
And health return to every village, every home, every family.
May Thy Light surround the children, the mothers, the elders,
Filling them with comfort, courage, and peace.
May those who grieve be held in Thy infinite Love,
And those who have been kept apart be reunited in joy.

Oh Gracious Provider, Sustainer of Life,
Bless the healers and helpers who give of themselves each day.
Guide their hands, protect their spirits, and magnify their every effort,
So that Thy healing may move through them freely.
May truth and understanding shine throughout these lands,
And may every community be drawn together in compassion,
Whole, strong, and at peace once more.

We thank Thee, Oh Eternal Source of Healing,
For allowing us to be channels
For Thy Divine Power and Love to flow out into our world.
May Thy Will always and forever be done.

Note what makes this example excellent:
- Opens immediately by invoking healing light — no preamble of sadness
- "May those who lie ill feel Thy healing Presence" — the sick are named and prayed for directly
- "May this outbreak be brought to an end" — explicit petition for the crisis to end
- Children, mothers, elders named specifically
- Grieving and separated — named once, then immediately resolved into love and reunion
- Helpers stanza is warm and practical
- "Whole, strong, and at peace once more" — the visualised outcome, stated as already coming
- No news vocabulary anywhere in the prayer body
- Every petition is stated as a positive arrival, not a plea against a negative

════════════════════════════
STORY FORMAT (the written description shown on the prayer page)
════════════════════════════

Write 2 short paragraphs, 150–200 words total.

Paragraph 1 (facts): What happened. Specific details — real place names, numbers of people affected, scale of the disaster, timeline. Draw on everything in the article. Be concrete and informative.

Paragraph 2 (human impact + prayer call): Why it matters. Name the people: families, children, communities, responders. End with a sentence that bridges to the prayer — something like "We pray for every soul caught in this crisis."

Style rules for story:
- Dignified, not dramatic
- Specific, not abstract — real numbers, real places
- Compassionate but factual tone
- No political sides, no blame

════════════════════════════
OUTPUT
════════════════════════════

Return ONLY valid JSON with these exact keys:
- title: short prayer card title, 6–10 words, starts with "Pray for..." (e.g. "Pray for the Flood Survivors of South Australia")
- summary: one sentence, max 20 words, for the prayer card widget
- body: the full prayer text (200–260 words, stanzas separated by \\n\\n, lines within stanzas separated by \\n)
- description: the full story text (150–200 words, two paragraphs separated by \\n\\n)
- slug: URL slug, lowercase hyphenated, no stopwords, max 60 chars
- imagePrompt: 1 sentence — a symbolic hopeful image, no faces, no text, no logos
- imageKeywords: array of 5 keywords for image search fallback`;

  const userMsg = `News headline: "${crisis.title}"
${crisis.summary ? `\nArticle summary: ${crisis.summary}` : ''}
Article URL: ${crisis.url}

Write the prayer and story for this crisis. Use specific details from the headline and summary — real place names, people affected, scale of the event. Make both the prayer and story vivid and grounded in what actually happened.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
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
  const res = await fetch(imageUrl, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrayForChange/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// Approved news domains whose og:image photos we'll accept
const APPROVED_NEWS_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'theguardian.com', 'npr.org', 'cnn.com',
  'channelnewsasia.com', 'abc.net.au', 'un.org', 'who.int',
];

function isApprovedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return APPROVED_NEWS_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function sourceImageFromArticle(articleUrl: string): Promise<ImageResult> {
  if (!isApprovedDomain(articleUrl)) {
    throw new Error(`Article domain not on approved list: ${articleUrl}`);
  }

  const res = await fetch(articleUrl, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PrayForChange/1.0; +https://prayforchange.org)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Article fetch error ${res.status}`);

  const html = await res.text();

  // Try og:image first, then twitter:image
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

  if (!ogMatch?.[1]) throw new Error('No og:image found in article');

  let imageUrl = ogMatch[1].trim();
  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  if (!imageUrl.startsWith('http')) throw new Error(`og:image URL invalid: ${imageUrl}`);

  // Skip tiny placeholder/logo images
  if (imageUrl.includes('logo') || imageUrl.includes('placeholder') || imageUrl.includes('default')) {
    throw new Error(`og:image looks like a logo/placeholder: ${imageUrl}`);
  }

  console.log(`[IMAGE] Found og:image: ${imageUrl}`);
  const imageBuffer = await downloadImage(imageUrl);

  // Must be at least 10KB to be a real photo
  if (imageBuffer.length < 10_000) throw new Error(`og:image too small (${imageBuffer.length} bytes) — likely a placeholder`);

  const ext = imageUrl.match(/\.(jpe?g|png|webp|gif)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const filename = `daily-prayer-${new Date().toISOString().split('T')[0]}-${randomBytes(4).toString('hex')}.${ext}`;
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const localPath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(localPath, imageBuffer);

  // Extract source name for attribution
  const sourceName = new URL(articleUrl).hostname.replace(/^www\./, '');

  return {
    localPath,
    serveUrl: `/assets/${filename}`,
    source: 'news_article',
    attribution: `Photo via ${sourceName}`,
  };
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

async function sourceImage(
  imagePrompt: string,
  imageKeywords: string[],
  articleUrl?: string,
): Promise<ImageResult | null> {
  // Step 1: Try real news photo from the article (og:image)
  if (articleUrl) {
    try {
      const result = await sourceImageFromArticle(articleUrl);
      console.log(`[IMAGE] Using real news photo from ${result.attribution}`);
      return result;
    } catch (err: any) {
      console.warn('[IMAGE] Article og:image failed:', err.message);
    }
  }

  // Step 2: AI-generated image via Replicate (only if key is configured)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      return await sourceImageFromReplicate(imagePrompt);
    } catch (err: any) {
      console.warn('[IMAGE] Replicate failed, trying Unsplash:', err.message);
    }
  } else {
    console.log('[IMAGE] REPLICATE_API_TOKEN not set — skipping');
  }

  // Step 3: Stock photo via Unsplash (only if key is configured)
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      return await sourceImageFromUnsplash(imageKeywords);
    } catch (err2: any) {
      console.warn('[IMAGE] Unsplash also failed:', err2.message);
    }
  } else {
    console.log('[IMAGE] UNSPLASH_ACCESS_KEY not set — skipping');
  }

  console.log('[IMAGE] No image sourced — prayer will be published without one');
  return null;
}

// ── Slug helper ──────────────────────────────────────────────────────────────

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

export async function runPipeline(): Promise<PipelineResult> {
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
      return { status: 'no_crisis' };
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
    const imageResult = await sourceImage(draft.imagePrompt, draft.imageKeywords, crisis.url);
    const imageLatencyMs = Date.now() - imageStart;
    const imageSource = imageResult?.source ?? 'none';
    console.log(`[STEP 3] Image sourced from ${imageSource} (${imageLatencyMs}ms)`);
    await storage.updateDailyPrayerRun(runLog.id, { imageSource, imageLatencyMs });

    // Step 4: Save as pending_approval draft
    console.log('[STEP 4] Saving prayer draft to database...');
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const descriptionParts = [draft.description || crisis.summary || crisis.title];
    if (imageResult?.attribution) descriptionParts.push(`\n\n${imageResult.attribution}`);
    const description = descriptionParts.join('');

    const crisisSeedCount = Math.floor(Math.random() * (6505 - 2303 + 1)) + 2303;

    const createdPrayer = await storage.createPrayer({
      title: draft.title,
      description,
      aiSummary: draft.description,
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

    return {
      status: 'success',
      crisisTitle: crisis.title,
      tier: tierResult.tier,
      confirmedOutlets: tierResult.confirmedOutlets,
      prayerTitle: draft.title,
      prayerId: pendingPrayer.id,
      approveUrl,
      rejectUrl,
    };

  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error('[DAILY-PRAYER] Pipeline failed:', errorMessage);
    await storage.updateDailyPrayerRun(runLog.id, { error: errorMessage }).catch(() => {});
    try {
      await sendDailyPrayerErrorEmail(errorMessage, 'pipeline');
    } catch {}
    return { status: 'error', error: errorMessage };
  }
}

// ── Standalone entry point (cron / npx tsx scripts/daily-prayer.ts) ──────────

async function runStandalone() {
  let result: PipelineResult;
  try {
    result = await runPipeline();
  } catch (err: any) {
    console.error('[DAILY-PRAYER] Unhandled error:', err);
    try {
      await sendDailyPrayerErrorEmail(err?.message || String(err), 'unhandled');
    } catch {}
    await pool.end().catch(() => {});
    process.exit(1);
  }

  await pool.end().catch(() => {});

  if (result!.status === 'error') {
    process.exit(1);
  }
}

// Only auto-execute when run directly as a script
const __filename = fileURLToPath(import.meta.url);
if (
  process.argv[1] === __filename ||
  process.argv[1]?.endsWith('/scripts/daily-prayer.ts') ||
  process.argv[1]?.endsWith('/scripts/daily-prayer.js')
) {
  runStandalone();
}
