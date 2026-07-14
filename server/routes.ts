import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPrayerSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { randomBytes, randomUUID } from "node:crypto";
import { sendPrayerSavedEmail, sendAdminPrayerCopyEmail, sendModerationEmail, sendCrisisPrayerEmailBatch, sendCrisisPrayerApprovalEmail } from "./emailService";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const embedPrayRateLimit = new Map<string, number>();
const subscribeRateLimit = new Map<string, number[]>(); // ip → array of timestamps (last hour)

// Opening lines prepended when the AI omits them
const REQUIRED_PRAYER_OPENING = `Oh Mighty God, Creator of Life,\nWe humbly raise our hearts to Thee`;

function ensurePrayerOpening(prayer: string): string {
  const trimmed = prayer.trim();
  const firstThreeLines = trimmed.split('\n').slice(0, 3).join('\n');
  // Accept prayers that open with "Oh [X]" AND include the second-line phrase in the first 3 lines
  if (/^oh\b/i.test(trimmed) && /we humbly raise our hearts to thee/i.test(firstThreeLines)) {
    return trimmed;
  }
  // Otherwise prepend the required opening
  return REQUIRED_PRAYER_OPENING + '\n' + trimmed;
}

function escapeHtmlEmbed(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFirstSentence(text: string, maxLen = 120): string {
  const clean = text.replace(/\n+/g, " ").trim();
  const match = clean.match(/^[^.!?]+[.!?]/);
  const sentence = match ? match[0].trim() : clean;
  if (!sentence) return "";
  return sentence.length > maxLen ? sentence.slice(0, maxLen - 3) + "..." : sentence;
}

function buildEmbedHtml(title: string, count: number, slug: string, summary?: string | null): string {
  const safeTitle = escapeHtmlEmbed(title);
  const safeCount = count.toLocaleString();
  const prayerUrl = `https://prayforchange.org/prayer/${slug}`;
  const summaryLine = summary ? getFirstSentence(summary) : "";
  const safeSummary = summaryLine ? escapeHtmlEmbed(summaryLine) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - PrayForChange</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 200px; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
      background: #fff;
      display: flex;
      align-items: stretch;
    }
    .card {
      width: 100%;
      padding: 16px 20px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .summary {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }
    .count {
      font-size: 13px;
      color: #6b7280;
    }
    .count strong { color: #111827; font-weight: 600; }
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pray-btn {
      background: #e11d48;
      color: #fff;
      border: none;
      border-radius: 9999px;
      padding: 8px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .pray-btn:hover:not(:disabled) { background: #be123c; }
    .pray-btn:active:not(:disabled) { transform: scale(0.97); }
    .pray-btn:disabled { background: #9ca3af; cursor: default; }
    .pray-btn.prayed { background: #16a34a; }
    .powered {
      font-size: 11px;
      color: #9ca3af;
      text-decoration: none;
    }
    .powered:hover { color: #6b7280; }
    @keyframes pop { 0%,100%{transform:scale(1)} 40%{transform:scale(1.25)} }
    .pop { animation: pop 0.35s ease; }
  </style>
</head>
<body>
  <div class="card">
    <div>
      <div class="title">${safeTitle}</div>
      ${safeSummary ? `<div class="summary">${safeSummary}</div>` : ''}
      <div class="count"><strong id="count-num">${safeCount}</strong> people praying</div>
    </div>
    <div class="actions">
      <button class="pray-btn" id="pray-btn" onclick="doPray()">Pray</button>
      <a class="powered" href="${prayerUrl}" target="_blank" rel="noopener">Powered by PrayForChange.org</a>
    </div>
  </div>
  <script>
    function doPray() {
      var btn = document.getElementById('pray-btn');
      btn.disabled = true;
      btn.textContent = 'Praying\u2026';
      fetch('/api/embed/${slug}/pray', { method: 'POST' })
        .then(function(r) {
          if (r.status === 429) { btn.textContent = 'Already prayed'; return; }
          if (!r.ok) { btn.disabled = false; btn.textContent = 'Pray'; return; }
          return r.json().then(function(data) {
            btn.textContent = 'Prayed \u2713';
            btn.classList.add('prayed');
            var el = document.getElementById('count-num');
            if (el && data.count != null) {
              el.textContent = data.count.toLocaleString();
              el.classList.remove('pop');
              void el.offsetWidth;
              el.classList.add('pop');
            }
          });
        })
        .catch(function() { btn.disabled = false; btn.textContent = 'Pray'; });
    }
  </script>
</body>
</html>`;
}

function buildUnsubscribePage(success: boolean): string {
  const message = success
    ? "You've been unsubscribed from the Daily Crisis Prayer. You can rejoin any time at <a href=\"https://prayforchange.org\" style=\"color:#e11d48;\">prayforchange.org</a>."
    : "This unsubscribe link is not valid or has already been used.";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed - PrayForChange</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}.card{max-width:480px;text-align:center;padding:40px 32px;border:1px solid #e5e7eb;border-radius:12px;}h1{font-size:22px;font-weight:700;margin:0 0 12px;}p{color:#6b7280;line-height:1.6;margin:0;}</style></head><body><div class="card"><h1>PrayForChange</h1><p>${message}</p></div></body></html>`;
}

const APPROVAL_PAGE_STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}.card{max-width:540px;width:100%;background:#fff;padding:40px 36px;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}h1{font-size:13px;font-weight:600;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin:0 0 10px;}h2{font-family:'Georgia',serif;font-size:22px;font-weight:700;color:#111827;margin:0 0 20px;line-height:1.35;}p{color:#6b7280;line-height:1.6;margin:0 0 24px;font-size:15px;}.btn-approve{display:inline-block;background:#166534;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;border:none;cursor:pointer;font-family:inherit;}.btn-reject{display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;border:1px solid #d1d5db;cursor:pointer;font-family:inherit;}.btn-reject-red{display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;border:none;cursor:pointer;font-family:inherit;}.secondary{font-size:13px;color:#9ca3af;margin:16px 0 0;}.secondary a{color:#6b7280;}`;

function buildApprovalConfirmPage(prayerTitle: string, prayerId: string, token: string): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Approve Prayer - PrayForChange</title><style>${APPROVAL_PAGE_STYLE}</style></head><body><div class="card"><h1>Daily Crisis Prayer</h1><h2>${esc(prayerTitle)}</h2><p>This will publish the prayer and immediately send it to all active subscribers.</p><form method="POST" action="/api/prayers/${esc(prayerId)}/approve?token=${esc(token)}"><button type="submit" class="btn-approve">Confirm Approval &amp; Send to Subscribers</button></form><p class="secondary"><a href="/api/prayers/${esc(prayerId)}/reject?token=${esc(token)}">No — reject this prayer instead</a></p></div></body></html>`;
}

function buildRejectConfirmPage(prayerTitle: string, prayerId: string, token: string): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reject Prayer - PrayForChange</title><style>${APPROVAL_PAGE_STYLE}</style></head><body><div class="card"><h1>Daily Crisis Prayer</h1><h2>${esc(prayerTitle)}</h2><p>This will remove the prayer from the approval queue without publishing it.</p><form method="POST" action="/api/prayers/${esc(prayerId)}/reject?token=${esc(token)}"><button type="submit" class="btn-reject-red">Confirm Rejection</button></form><p class="secondary"><a href="/api/prayers/${esc(prayerId)}/approve?token=${esc(token)}">Go back to approval page</a></p></div></body></html>`;
}

function buildApprovalSuccessPage(prayerTitle: string, sent: number): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prayer Approved - PrayForChange</title><style>${APPROVAL_PAGE_STYLE}</style></head><body><div class="card"><h1>Prayer Approved</h1><h2>${esc(prayerTitle)}</h2><p>The prayer has been published and sent to <strong>${sent.toLocaleString()} subscriber${sent !== 1 ? 's' : ''}</strong>.</p></div></body></html>`;
}

function buildRejectSuccessPage(prayerTitle: string): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prayer Rejected - PrayForChange</title><style>${APPROVAL_PAGE_STYLE}</style></head><body><div class="card"><h1>Prayer Rejected</h1><h2>${esc(prayerTitle)}</h2><p>The prayer has been rejected and removed from the approval queue.</p></div></body></html>`;
}

function buildApprovalErrorPage(message: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error - PrayForChange</title><style>${APPROVAL_PAGE_STYLE}</style></head><body><div class="card"><h1>PrayForChange</h1><h2>Unable to process request</h2><p>${message}</p></div></body></html>`;
}

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_IMAGE_MIMES[file.mimetype] ?? ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES[file.mimetype]) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  },
});


// Approved Prayer Style Library prompt (Jack Stafford, July 2026) — category-aware, shared by
// /api/generate-prayer and /api/prayers/:id/regenerate.
function buildRecitablePrayerPrompt(title: string, description?: string | null): string {
  return `Write a beautiful, structured prayer for a community to recite together for: ${title}
${description ? `Context: ${description}` : ''}

STEP 1 — CLASSIFY this request into exactly ONE category:
- war-conflict: war, armed conflict, civil unrest, political crisis, peace talks
- disaster: earthquake, flood, storm, wildfire, landslide, extreme weather
- tragedy: fire, crash, collapse, attack, sudden mass loss of life
- health: disease outbreak, health emergency, or personal illness and healing
- hunger: famine, hunger, refugees, displacement
- grief: bereavement and loss of a loved one
- guidance: hardship, difficult decisions, anxiety, need for strength
- gratitude: thanksgiving and answered prayers
- relationships: family, marriage, friendship, community harmony
- blessing: anything else

STEP 2 — WRITE the prayer following ALL of these voice rules:
1. Free verse, no rhyme. Crisis categories (war-conflict, disaster, tragedy, health, hunger): 4-5 stanzas of 5-7 short lines. Personal categories: 3-4 stanzas. Maximum 170 words.
2. DIVINE ADDRESSES — vary them, rotating across stanzas, chosen ONLY from this pool: "Oh God", "Oh Wondrous God", "Oh Mighty God", "Oh Mighty Creator of All Life", "Oh Divine and Wondrous Creator". NEVER use tradition-specific names (no Brahma, Lord, Father, Allah, Jesus, Krishna, etc.).
3. Register: "Thee", "Thy", "Thine". Capitalize Divine Love, Light of Peace, Infinite Power, Divine Will.
4. Stanza 1 must name the real subject — the actual place, event or person from the request. Never generic.
5. Pray for TWO groups: those who are suffering AND those with the power to help — matched to the category:
   - disaster/tragedy: rescuers, firefighters, doctors, volunteers "and all those with the power to send relief"
   - health: doctors, nurses and carers "and all who guide the response"
   - hunger: aid workers, and "may the hearts of all who have plenty be opened wide in generosity"
   - war-conflict ONLY: "the peacemakers and the negotiators, and all those in power", "inspired by their higher selves to act for the greatest good of all"
   FORBIDDEN: mentioning leaders, those in power, or "freedom and peace" outside the war-conflict category. A fire or flood prayer blesses rescuers, never politicians.
6. Weave in approved phrases where natural: "we humbly raise our hearts to Thee", "the radiant Light of Divine Love", "the wounded and the grieving, the frightened and the lost", "in their desperate need at this time", "a new era of Love and Understanding", "one with another".
7. Category endings: disaster ends in rebuilding hope ("New strength, new kindness, new life"); tragedy includes "may those who have passed onwards be received into Thy Light and Peace"; hunger ends with "we are one family upon this Earth"; grief ends in comfort and sweet remembrance; gratitude ends with gifts received becoming gifts bestowed.
8. Dignified, never dramatic. Interfaith. Never partisan, never assign blame.
9. The final line must be exactly: "May Divine Will be done."

FORMAT: Each phrase on its own line, blank line between stanzas. Output ONLY the prayer text with no title, no category name and no commentary, beginning with a divine address from the approved pool followed on the next line by "We humbly raise our hearts to Thee".`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve static assets from attached_assets/generated_images
  const assetsPath = path.resolve(process.cwd(), "attached_assets/generated_images");
  app.use("/assets", express.static(assetsPath));

  // Serve user-uploaded images (under /api/ prefix to bypass CDN static interception)
  app.use("/api/uploads", express.static(uploadsDir));

  // Image upload endpoint
  // Note: served under /api/uploads/ (not /uploads/) so Replit's CDN static-asset
  // interception (publicDir) does not intercept image requests and return 500.
  app.post("/api/upload-image", (req, res) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Image must be under 8MB" });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
      }
      if (!req.file) return res.status(400).json({ error: "No image provided" });
      // Return a base64 data URI instead of a file path: production's filesystem is
      // ephemeral (Replit autoscale), so files written to /uploads silently vanish.
      // Data URIs live in the prayer record itself and survive redeploys.
      const uploadedPath = req.file.path;
      (async () => {
        try {
          const sharp = (await import("sharp")).default;
          const resized = await sharp(uploadedPath)
            .rotate()
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          fs.unlink(uploadedPath, () => {});
          const url = `data:image/jpeg;base64,${resized.toString("base64")}`;
          return res.json({ url });
        } catch (e: any) {
          console.error("upload-image processing failed:", e?.message || e);
          fs.unlink(uploadedPath, () => {});
          return res.status(500).json({ error: "Failed to process image" });
        }
      })();
      return;
    });
  });
  
  // Setup authentication
  await setupAuth(app);

  // Redirect UUID-based prayer URLs to slug-based URLs (301 permanent)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.get("/prayer/:id", async (req, res, next) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) return next();
    try {
      const prayer = await storage.getPrayerById(id);
      if (prayer?.slug) {
        return res.redirect(301, `/prayer/${prayer.slug}`);
      }
    } catch {
      // fall through on error
    }
    return next();
  });

  // Sitemap
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = process.env.SITE_URL || "https://prayforchange.org";
      const publicPrayers = await storage.getPublicPrayers();

      const formatDate = (date: Date) => date.toISOString().split("T")[0];

      const PRAYER_CATEGORIES = [
        "Health", "Family", "Employment", "World Peace",
        "Community", "Faith", "Education", "Gratitude", "General",
      ];

      const staticUrls = [
        `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
        `  <url>\n    <loc>${baseUrl}/how-to-pray</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
        `  <url>\n    <loc>${baseUrl}/browse</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`,
        ...PRAYER_CATEGORIES.map(cat =>
          `  <url>\n    <loc>${baseUrl}/browse?topic=${encodeURIComponent(cat)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
        ),
      ];

      const prayerUrls = publicPrayers.map((p) =>
        `  <url>\n    <loc>${baseUrl}/prayer/${p.slug || p.id}</loc>\n    <lastmod>${formatDate(p.createdAt)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
      );

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...staticUrls,
        ...prayerUrls,
        "</urlset>",
      ].join("\n");

      res.set("Content-Type", "application/xml");
      res.status(200).send(xml);
    } catch (error) {
      console.error("[sitemap] Failed to generate sitemap:", error);
      res.status(500).send("Failed to generate sitemap");
    }
  });

  // widget.js — injectable script for external sites
  app.get("/widget.js", (_req, res) => {
    const js = `(function(){var s=document.currentScript;var slug=s&&s.getAttribute('data-prayer');if(!slug)return;var f=document.createElement('iframe');f.src='https://prayforchange.org/embed/'+slug;f.style.cssText='width:100%;height:200px;border:none;border-radius:8px;display:block;';f.setAttribute('frameborder','0');f.setAttribute('scrolling','no');f.setAttribute('allowtransparency','true');s.parentNode.insertBefore(f,s.nextSibling);})();`;
    res.set("Content-Type", "application/javascript");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=3600");
    res.status(200).send(js);
  });

  // Embed prayer widget page — server-side rendered, no React
  app.get("/embed/:slug", async (req, res) => {
    const { slug } = req.params;
    res.set("Access-Control-Allow-Origin", "*");
    res.set("X-Frame-Options", "ALLOWALL");
    res.set("Content-Type", "text/html");
    try {
      const prayer = await storage.getPrayerBySlugOrId(slug);
      if (!prayer) {
        return res.status(404).send("<!DOCTYPE html><html><body><p style='font-family:sans-serif;padding:20px;color:#6b7280;'>Prayer not found.</p></body></html>");
      }
      const html = buildEmbedHtml(prayer.title, prayer.count, prayer.slug || prayer.id, prayer.aiSummary || prayer.description || "");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[embed] Failed to render embed:", err);
      return res.status(500).send("<!DOCTYPE html><html><body><p style='font-family:sans-serif;padding:20px;color:#6b7280;'>Unable to load prayer.</p></body></html>");
    }
  });

  // Embed pray action — rate-limited (1 per IP per prayer per hour)
  app.post("/api/embed/:slug/pray", async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    try {
      const prayer = await storage.getPrayerBySlugOrId(req.params.slug);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }
      const ip = req.ip || "unknown";
      const key = `${ip}:${prayer.id}`;
      const lastPray = embedPrayRateLimit.get(key);
      const ONE_HOUR = 60 * 60 * 1000;
      if (lastPray && Date.now() - lastPray < ONE_HOUR) {
        return res.status(429).json({ error: "Already prayed recently" });
      }
      const updated = await storage.incrementPrayerCount(prayer.id);
      embedPrayRateLimit.set(key, Date.now());
      storage.incrementDailyPrayerCount(prayer.id).catch((err: any) => {
        console.error("[embed] Failed to track daily prayer count:", err);
      });
      return res.json(updated);
    } catch (err: any) {
      console.error("[embed] Failed to process pray:", err);
      return res.status(500).json({ error: "Failed to process prayer" });
    }
  });

  // Subscribe to Daily Crisis Prayer
  app.post("/api/subscribe", async (req, res) => {
    try {
      const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const email = parsed.data.email.toLowerCase().trim();

      const ip = req.ip || "unknown";
      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      const timestamps = (subscribeRateLimit.get(ip) || []).filter(t => now - t < ONE_HOUR);
      if (timestamps.length >= 5) {
        return res.status(429).json({ error: "Too many signups. Please try again later." });
      }
      timestamps.push(now);
      subscribeRateLimit.set(ip, timestamps);

      const token = randomBytes(32).toString("hex");
      const status = await storage.addSubscriber(email, token);
      return res.json({ status });
    } catch (err: any) {
      console.error("[subscribe] Failed to process subscription:", err);
      return res.status(500).json({ error: "Failed to process subscription" });
    }
  });

  // Unsubscribe via token (server-rendered HTML, not React)
  app.get("/api/unsubscribe", async (req, res) => {
    res.set("Content-Type", "text/html");
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.status(200).send(buildUnsubscribePage(false));
    }
    try {
      const deactivated = await storage.deactivateSubscriberByToken(token);
      return res.status(200).send(buildUnsubscribePage(deactivated));
    } catch (err: any) {
      console.error("[unsubscribe] Failed:", err);
      return res.status(200).send(buildUnsubscribePage(false));
    }
  });

  const CRISIS_PRAYER_EMAIL = 'jackstaffmail@gmail.com';
  const APPROVER_EMAIL = 'mrjackstafford@gmail.com';
  const SITE_URL = process.env.SITE_URL || 'https://prayforchange.org';

  // Get the latest published daily crisis prayer (public, no auth required)
  // MUST be before any /api/prayers/:id parameterized route
  app.get("/api/prayers/latest-crisis", async (_req, res) => {
    try {
      const prayer = await storage.getLatestCrisisPrayer();
      if (!prayer) return res.json(null);
      return res.json(prayer);
    } catch (err: any) {
      console.error("[latest-crisis] Failed:", err);
      return res.status(500).json({ error: "Failed to fetch latest crisis prayer" });
    }
  });

  // Related prayers — up to 4 prayers in the same category, excluding current
  app.get("/api/prayers/:id/related", async (req, res) => {
    try {
      const prayer = await storage.getPrayerBySlugOrId(req.params.id);
      if (!prayer) return res.status(404).json({ error: "Prayer not found" });
      const related = await storage.getRelatedPrayers(prayer.id, prayer.topic, 4);
      return res.json(related);
    } catch (err: any) {
      console.error("[related] Failed:", err);
      return res.status(500).json({ error: "Failed to fetch related prayers" });
    }
  });

  // Get crisis prayer status for a specific prayer (auth-required)
  app.get("/api/prayers/:id/crisis-status", isAuthenticated, async (req: any, res) => {
    try {
      const sessionUserId: string = req.session.userId;
      const prayer = await storage.getPrayerBySlugOrId(req.params.id);
      if (!prayer) return res.status(404).json({ error: "Prayer not found" });

      // Check if the current session user IS the crisis prayer account and IS the author
      let canSend = false;
      if (prayer.authorId && sessionUserId === prayer.authorId) {
        const author = await storage.getUser(prayer.authorId);
        canSend = !!(author && author.email?.toLowerCase() === CRISIS_PRAYER_EMAIL.toLowerCase());
      }

      if (!canSend) {
        // Non-owners only get the bare minimum (no send metadata)
        return res.json({ isCrisisPrayer: false, canSend: false, sentToday: false, lastSentAt: null, lastSentCount: null });
      }

      const todaySend = await storage.getCrisisPrayerSendToday();
      return res.json({
        isCrisisPrayer: true,
        canSend: true,
        sentToday: !!todaySend,
        lastSentAt: todaySend?.sentAt ?? null,
        lastSentCount: todaySend?.subscriberCount ?? null,
      });
    } catch (err: any) {
      console.error("[crisis-status] Failed:", err);
      return res.status(500).json({ error: "Failed to check crisis status" });
    }
  });

  // Send Daily Crisis Prayer to all active subscribers (jackstaffmail@gmail.com only)
  app.post("/api/prayers/:id/send-crisis-email", isAuthenticated, async (req: any, res) => {
    try {
      const sessionUserId: string = req.session.userId;

      const prayer = await storage.getPrayerBySlugOrId(req.params.id);
      if (!prayer) return res.status(404).json({ error: "Prayer not found" });

      if (!prayer.authorId) return res.status(403).json({ error: "Forbidden" });
      if (sessionUserId !== prayer.authorId) {
        return res.status(403).json({ error: "Forbidden: not your prayer" });
      }
      const author = await storage.getUser(prayer.authorId);
      if (!author || author.email?.toLowerCase() !== CRISIS_PRAYER_EMAIL.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden: not a crisis prayer account" });
      }

      // One-per-day guard
      const todaySend = await storage.getCrisisPrayerSendToday();
      if (todaySend) {
        return res.status(409).json({ error: "Already sent today", sentCount: todaySend.subscriberCount });
      }

      const allSubscribers = await storage.getActiveSubscribers();
      const prayerUrl = `${SITE_URL}/prayer/${prayer.slug || prayer.id}`;

      const { sent, failed } = await sendCrisisPrayerEmailBatch(allSubscribers, prayer, prayerUrl, prayer.count);

      await storage.logCrisisPrayerSend(prayer.id, sent);
      console.log(`[CRISIS] Daily crisis prayer sent: ${sent} delivered, ${failed} failed`);
      return res.json({ sent, failed });
    } catch (err: any) {
      console.error("[crisis-send] Failed:", err);
      return res.status(500).json({ error: "Failed to send crisis prayer email" });
    }
  });

  // ── Approval flow: GET renders confirmation page, POST performs the action ─────────────────

  async function resolveApprovalToken(id: string, token: string) {
    if (!token) return { ok: false as const, errorHtml: buildApprovalErrorPage('No token provided.') };
    const prayer = await storage.getPrayerByApprovalToken(token);
    if (!prayer || prayer.id !== id) return { ok: false as const, errorHtml: buildApprovalErrorPage('This approval link is invalid or has already been used.') };
    if (!prayer.approvalTokenExpiry || prayer.approvalTokenExpiry < new Date()) return { ok: false as const, errorHtml: buildApprovalErrorPage('This approval link has expired. Please create a new prayer.') };
    if (prayer.approvalStatus !== 'pending_approval') return { ok: false as const, errorHtml: buildApprovalErrorPage('This prayer has already been approved or rejected.') };
    return { ok: true as const, prayer };
  }

  // GET /api/prayers/:id/approve — renders confirmation page (safe for email prefetch)
  app.get("/api/prayers/:id/approve", async (req: any, res) => {
    try {
      const { id } = req.params;
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await resolveApprovalToken(id, token);
      if (!result.ok) return res.status(400).send(result.errorHtml);
      return res.send(buildApprovalConfirmPage(result.prayer.title, id, token));
    } catch (err: any) {
      console.error('[approval-get] Failed:', err);
      return res.status(500).send(buildApprovalErrorPage('An unexpected error occurred.'));
    }
  });

  // POST /api/prayers/:id/approve — publishes prayer and sends to subscribers
  app.post("/api/prayers/:id/approve", async (req: any, res) => {
    try {
      const { id } = req.params;
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await resolveApprovalToken(id, token);
      if (!result.ok) return res.status(400).send(result.errorHtml);

      await storage.setPrayerApprovalStatus(id, 'published');
      const publishedPrayer = await storage.getPrayerById(id);
      if (!publishedPrayer) return res.status(500).send(buildApprovalErrorPage('Prayer not found after approval.'));

      const prayerUrl = `${SITE_URL}/prayer/${publishedPrayer.slug || id}`;
      const allSubscribers = await storage.getActiveSubscribers();
      const { sent, failed } = await sendCrisisPrayerEmailBatch(allSubscribers, publishedPrayer, prayerUrl, publishedPrayer.count);
      await storage.logCrisisPrayerSend(id, sent);
      console.log(`[APPROVAL] Prayer ${id} approved and sent: ${sent} delivered, ${failed} failed`);

      // Update daily_prayer_runs observability row (best-effort, non-blocking)
      try {
        const run = await storage.getDailyPrayerRunByDraftId(id);
        if (run) {
          const now = new Date();
          await storage.updateDailyPrayerRun(run.id, {
            approvedAt: now,
            publishedAt: now,
            newsletterRecipients: sent,
          });
        }
      } catch (runErr: any) {
        console.warn('[APPROVAL] Could not update daily_prayer_runs row:', runErr?.message);
      }

      return res.send(buildApprovalSuccessPage(publishedPrayer.title, sent));
    } catch (err: any) {
      console.error('[approval-post] Failed:', err);
      return res.status(500).send(buildApprovalErrorPage('An unexpected error occurred while approving.'));
    }
  });

  // GET /api/prayers/:id/reject — renders rejection confirmation page
  app.get("/api/prayers/:id/reject", async (req: any, res) => {
    try {
      const { id } = req.params;
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await resolveApprovalToken(id, token);
      if (!result.ok) return res.status(400).send(result.errorHtml);
      return res.send(buildRejectConfirmPage(result.prayer.title, id, token));
    } catch (err: any) {
      console.error('[reject-get] Failed:', err);
      return res.status(500).send(buildApprovalErrorPage('An unexpected error occurred.'));
    }
  });

  // POST /api/prayers/:id/reject — marks prayer as rejected
  app.post("/api/prayers/:id/reject", async (req: any, res) => {
    try {
      const { id } = req.params;
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await resolveApprovalToken(id, token);
      if (!result.ok) return res.status(400).send(result.errorHtml);

      await storage.setPrayerApprovalStatus(id, 'rejected');
      console.log(`[APPROVAL] Prayer ${id} rejected`);

      // Update daily_prayer_runs observability row (best-effort, non-blocking)
      try {
        const run = await storage.getDailyPrayerRunByDraftId(id);
        if (run) {
          await storage.updateDailyPrayerRun(run.id, { error: 'rejected_by_approver' });
        }
      } catch (runErr: any) {
        console.warn('[APPROVAL] Could not update daily_prayer_runs row:', runErr?.message);
      }

      return res.send(buildRejectSuccessPage(result.prayer.title));
    } catch (err: any) {
      console.error('[reject-post] Failed:', err);
      return res.status(500).send(buildApprovalErrorPage('An unexpected error occurred while rejecting.'));
    }
  });

  app.post("/api/check-tone", async (req, res) => {
    try {
      const { title, description } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!openai) {
        return res.json({ isNegative: false });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a prayer tone analyzer for a prayer platform. Analyze the user's prayer title and description to determine if it is framed negatively.

A prayer is NEGATIVE if it:
- Is directed AGAINST a group, religion, ethnicity, nationality, or people
- Contains hateful, vengeful, violent, or threatening language (e.g., "kill", "destroy", "hurt", "punish", "attack")
- Wishes harm, death, or misfortune on others
- Contains threats against specific individuals or groups
- Is primarily about stopping, defeating, or destroying something rather than building something positive

A prayer is POSITIVE if it:
- Asks for healing, strength, hope, peace, or growth
- Is framed around building up rather than tearing down
- Expresses sadness or concern without directing hostility at others

If the prayer is negative, reframe it into a positive alternative. Turn "against X" into "for Y":
- "Stop the spread of Islam in America" → "Pray for the strengthening of Christianity in America"
- "Defeat my enemies" → "Pray for peace and reconciliation in my relationships"
- "Punish those who wronged me" → "Pray for justice and healing from this pain"
- "Destroy the corruption" → "Pray for integrity and honest leadership"
- "I want to kill all world leaders" → "Pray for wisdom and compassion for world leaders"

IMPORTANT: Any input containing threats, violence, or wishes of death MUST be classified as NEGATIVE. Always respond with valid JSON even for extreme content.

Respond with ONLY valid JSON (no markdown):
{"isNegative": true/false, "suggestion": "Your positive reframing here or null if positive"}`
        }, {
          role: "user",
          content: `Title: ${title}${description ? `\nDescription: ${description}` : ''}`
        }],
        temperature: 0.3,
        max_tokens: 200,
      });

      let content = response.choices[0]?.message?.content?.trim() || '{"isNegative": false}';
      const refusal = response.choices[0]?.message?.refusal;
      if (refusal) {
        return res.json({ isNegative: true, suggestion: "Pray for peace and compassion in our world" });
      }
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      try {
        const result = JSON.parse(content);
        res.json({ isNegative: !!result.isNegative, suggestion: result.suggestion || undefined });
      } catch {
        if (/sorry|can't assist|cannot assist|unable to|not able to/i.test(content)) {
          return res.json({ isNegative: true, suggestion: "Pray for peace and compassion in our world" });
        }
        res.json({ isNegative: true, suggestion: "Pray for peace and compassion in our world" });
      }
    } catch (error) {
      console.error("Error checking prayer tone:", error);
      res.json({ isNegative: false });
    }
  });

  app.post("/api/suggest-title", async (req, res) => {
    try {
      const { title, description } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!openai) {
        return res.json({ suggestedTitle: title });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You improve prayer request titles for a community prayer platform. Given a user's raw title, suggest a more compelling, clear, and heartfelt version.

Rules:
- Keep it concise (under 12 words)
- Keep the core meaning and intent identical
- Make it more evocative and emotionally resonant
- Use sentence case (capitalize first word and proper nouns only)
- Do NOT add quotation marks around the title
- If the title is already excellent, return it unchanged

Respond with ONLY valid JSON (no markdown):
{"suggestedTitle": "Your improved title here"}`
        }, {
          role: "user",
          content: `Title: ${title}${description ? `\nContext: ${description}` : ''}`
        }],
        temperature: 0.7,
        max_tokens: 100,
      });

      let content = response.choices[0]?.message?.content?.trim() || `{"suggestedTitle": "${title}"}`;
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const result = JSON.parse(content);
      res.json({ suggestedTitle: result.suggestedTitle || title });
    } catch (error) {
      console.error("Error suggesting title:", error);
      res.json({ suggestedTitle: req.body.title });
    }
  });

  // Generate prayer content using OpenAI (text only - fast)
  app.post("/api/generate-prayer", async (req, res) => {
    try {
      const { title, description, instructions, currentSummary, currentPrayer } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI service is not configured. Please set OPENAI_API_KEY." });
      }

      // Generate AI summary and prayer in parallel
      const summaryPrompt = instructions && currentSummary
        ? `You are revising a prayer request story based on user feedback.

Current version:
${currentSummary}

User's instructions for changes:
${instructions}

Please revise the story incorporating these changes while maintaining the heartfelt, first-person tone. Keep it under 125 words. Do NOT include a title or heading. Jump straight into the revised story.`
        : `You are writing a heartfelt prayer request story for a platform similar to Change.org but for prayers.

Title: ${title}
${description ? `Personal context: ${description}` : ''}

Write a compelling story that:
1. Opens with the urgency and importance of this prayer need
2. ${description ? 'Incorporates the personal context provided' : 'Expands on why this prayer matters'}
3. Calls others to join in prayer
4. Inspires hope and unity

IMPORTANT: Do NOT include a title or heading at the start. Jump straight into the story. Do not use any markdown formatting like ** or ##.

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.

WORD LIMIT: Your response must be 125 words or fewer. Be concise and impactful.`;

      const prayerPrompt = instructions && currentPrayer
        ? `You are revising a community prayer based on user feedback.

Current prayer:
${currentPrayer}

User's instructions for changes:
${instructions}

Please revise the prayer incorporating these changes while maintaining the sacred, lyrical free-verse stanza format of the original. Keep it under 170 words. Always end with "May Divine Will be done."

MANDATORY: Your response MUST open with an "Oh [Divine Name]" invocation (e.g. "Oh Wondrous God," or "Oh Mighty God, Creator of Life,") followed on the next line by "We humbly raise our hearts to Thee".`
        : buildRecitablePrayerPrompt(title, description);

      const categoryPrompt = `Classify this prayer request into exactly one of these categories: Health, Family, Employment, World Peace, Community, Faith, Education, Gratitude, General.

Title: ${title}
${description ? `Description: ${description}` : ''}

Respond with ONLY the category name, nothing else.`;

      // Run all three GPT calls in parallel for speed
      const [summaryResponse, prayerResponse, categoryResponse] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.8,
        }),
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prayerPrompt }],
          temperature: 0.7,
        }),
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: categoryPrompt }],
          temperature: 0.1,
        })
      ]);

      const aiSummary = summaryResponse.choices[0].message.content || "";
      const recitablePrayer = ensurePrayerOpening(prayerResponse.choices[0].message.content || "");

      const refusalPattern = /^I'?m sorry|^I can'?t assist|^I cannot assist|^I'?m unable to|^I'?m not able to|^Sorry,? but/i;
      if (refusalPattern.test(aiSummary.trim()) || refusalPattern.test(recitablePrayer.trim())) {
        return res.status(422).json({
          error: "We couldn't generate a prayer for this request. Please try rephrasing your title to focus on something positive and hopeful.",
        });
      }

      const rawCategory = (categoryResponse.choices[0].message.content || "").trim();
      const validCategories = ["Health", "Family", "Employment", "World Peace", "Community", "Faith", "Education", "Gratitude", "General"];
      const topic = validCategories.includes(rawCategory) ? rawCategory : "General";

      res.json({
        aiSummary,
        recitablePrayer,
        imageUrl: "",
        topic,
      });
    } catch (error: any) {
      console.error("Error generating prayer:", error);
      res.status(500).json({ 
        error: "Failed to generate prayer content",
        details: error.message 
      });
    }
  });

  // Generate image separately (slow operation)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { title, aiSummary } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI service is not configured. Please set OPENAI_API_KEY." });
      }

      const promptGenerationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a world-class art director specializing in cinematic fine-art photography and painterly illustration. You write DALL-E prompts that produce breathtaking, gallery-quality artwork. Every prompt you write is 80-150 words and follows this exact structure:

BEGIN with the medium and style — choose one per prompt and be highly specific:
  "Luminous oil painting with visible impasto brushstrokes", "Cinematic digital matte painting reminiscent of Hudson River School landscapes", "Ethereal soft-focus photograph with painterly post-processing", "Delicate ink-and-watercolor illustration with wet-on-wet bleeds", "Rich gouache painting with flat graphic shapes and atmospheric depth", "Warm editorial illustration in the style of contemporary picture-book art"

Then layer these elements:
1. FOCAL POINT: One central symbolic element placed using the rule of thirds — a single ancient tree, a candle flame reflected in still water, a bird mid-flight, a winding river path, roots breaking through stone, a seed sprouting in cupped hands
2. DEPTH & COMPOSITION: Three distinct planes — detailed foreground texture (moss, petals, dewdrops), mid-ground subject, atmospheric background with aerial perspective and distant haze
3. LIGHTING: Use precise cinematic terms — "volumetric god rays filtering through canopy", "warm rim lighting with cool ambient fill", "chiaroscuro with a single golden light source", "soft diffused overcast with luminous highlights"
4. COLOR PALETTE: Name exactly 4 colors from fine-art vocabulary — e.g., "burnt sienna, raw umber, gold leaf highlights, and muted sage"; "cerulean blue, rose madder, warm titanium white, and deep viridian"
5. TEXTURE & SURFACE: Describe the physical quality — "soft bokeh in background", "visible canvas grain", "delicate paper texture bleeding through washes", "atmospheric particulates catching light"
6. EMOTIONAL TONE: One vivid phrase — "the stillness after a long exhale", "the fragile courage of a first step", "quiet resilience in morning light"

ABSOLUTE RULES (include these constraints verbatim at the end of every prompt):
- Absolutely no text, words, letters, numbers, typography, or watermarks
- No human faces or recognizable people (hands, silhouettes from behind, and distant anonymous figures are acceptable)
- No religious symbols of any kind (no crosses, crescents, stars of David, prayer beads, church buildings)
- No low-quality, blurry, or distorted elements
- Photorealistic details in nature elements: accurate leaf veins, realistic water caustics, true-to-life cloud formations`
        }, {
          role: "user",
          content: `First, identify the single deepest emotion in this prayer — is it grief, hope, fear, gratitude, longing, courage, or something else? Then write a DALL-E prompt that visually embodies that emotion through symbolic nature imagery. Respond with ONLY the prompt, nothing else.

Title: ${title}
${aiSummary ? `Context: ${aiSummary.substring(0, 800)}` : ''}`
        }],
        temperature: 0.8,
      });

      const imagePrompt = promptGenerationResponse.choices[0].message.content || 
        `Evocative image symbolizing hope and healing: golden sunlight breaking through clouds over a peaceful landscape. Style: warm, emotional, cinematic. Avoid: text, faces, religious symbols.`;

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1792x1024",
        quality: "hd",
        n: 1,
      });

      const imageUrl = imageResponse.data?.[0]?.url || "";
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Get public prayers (only those with 5+ prayer count)
  app.get("/api/prayers", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
      const topic = typeof req.query.topic === 'string' && req.query.topic.trim() ? req.query.topic.trim() : undefined;

      const publicPrayers = await storage.getPublicPrayers({ q, topic });
      res.json(publicPrayers);
    } catch (error: any) {
      console.error("Error fetching prayers:", error);
      res.status(500).json({ error: "Failed to fetch prayers" });
    }
  });

  // Get prayers by current user (includes non-public prayers)
  app.get("/api/my-prayers", async (req: any, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userId = req.session.userId;
      const userPrayers = await storage.getPrayersByAuthor(userId);
      res.json(userPrayers);
    } catch (error: any) {
      console.error("Error fetching user prayers:", error?.stack || error);
      res.status(500).json({ error: "Failed to fetch user prayers", details: error?.message || String(error) });
    }
  });

  // Get prayer by slug or ID
  app.get("/api/prayers/:id", async (req, res) => {
    try {
      const prayer = await storage.getPrayerBySlugOrId(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }
      res.json(prayer);
    } catch (error: any) {
      console.error("Error fetching prayer:", error);
      res.status(500).json({ error: "Failed to fetch prayer" });
    }
  });

  // Create new prayer
  app.post("/api/prayers", async (req: any, res) => {
    try {
      const { toneSuggestion, ...bodyData } = req.body;
      const validatedData = insertPrayerSchema.parse(bodyData);
      
      // Link prayer to logged-in user if authenticated
      const userId = req.session?.userId;

      // Fetch author early so we can seed count/goal for the crisis account before saving
      const authorUser = userId ? await storage.getUser(userId) : undefined;
      const isCrisisPrayerAccount = !!(userId && authorUser?.email?.toLowerCase() === CRISIS_PRAYER_EMAIL.toLowerCase());

      // Crisis account prayers get a seeded community count and a high goal
      const crisisSeedCount = isCrisisPrayerAccount
        ? Math.floor(Math.random() * (6505 - 2303 + 1)) + 2303
        : undefined;

      const prayerData = {
        ...validatedData,
        goal: isCrisisPrayerAccount ? 10000 : 100,
        count: isCrisisPrayerAccount ? crisisSeedCount : validatedData.count,
        authorId: userId || null,
        isDailyCrisisPrayer: isCrisisPrayerAccount,
      };
      
      const prayer = await storage.createPrayer(prayerData);
      const prayerContent = prayer.recitablePrayer || prayer.aiSummary || prayer.description || '';

      let prayerResponse: typeof prayer = prayer;

      if (isCrisisPrayerAccount) {
        // Hold for editorial approval before publishing or sending to subscribers
        const token = randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const pendingPrayer = await storage.setPrayerPendingApproval(prayer.id, token, expiry);
        const approveUrl = `${SITE_URL}/api/prayers/${prayer.id}/approve?token=${token}`;
        const rejectUrl = `${SITE_URL}/api/prayers/${prayer.id}/reject?token=${token}`;
        sendCrisisPrayerApprovalEmail(pendingPrayer, approveUrl, rejectUrl).catch((err: any) => {
          console.error('[APPROVAL] Failed to send approval email:', err?.message || err);
        });
        console.log(`[APPROVAL] Crisis prayer ${prayer.id} held for approval, email sent to ${APPROVER_EMAIL}`);
        prayerResponse = pendingPrayer;
      } else {
        // Normal email flow for all other accounts
        if (authorUser?.email) {
          sendPrayerSavedEmail(authorUser.email, authorUser.firstName || 'Friend', prayer.title, prayerContent).catch(() => {});
        }
        const authorName = prayer.author || 'Anonymous';
        if (prayer.flaggedForReview) {
          sendModerationEmail(prayer.title, prayer.description || '', prayerContent, authorName, toneSuggestion).catch(() => {});
        } else {
          sendAdminPrayerCopyEmail(prayer.title, prayer.description || '', prayerContent, authorName, prayer.imageUrl).catch(() => {});
        }
      }

      res.status(201).json(prayerResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid prayer data", details: error.errors });
      }
      console.error("Error creating prayer:", error);
      res.status(500).json({ error: "Failed to create prayer" });
    }
  });

  // Get updates for a prayer
  app.get("/api/prayers/:id/updates", async (req, res) => {
    try {
      const updates = await storage.getUpdatesByPrayerId(req.params.id);
      res.json(updates);
    } catch (error: any) {
      console.error("Error fetching prayer updates:", error);
      res.status(500).json({ error: "Failed to fetch updates" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { firstName, lastName, email, emailOptIn } = req.body;

      if (email && typeof email === 'string') {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== userId) {
          return res.status(409).json({ error: "This email is already in use by another account." });
        }
      }

      const currentUser = userId ? await storage.getUser(userId) : undefined;
      const oldFullName = [currentUser?.firstName || '', currentUser?.lastName || ''].filter(Boolean).join(' ') || 'Anonymous';

      const updated = await storage.updateUser(userId, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(emailOptIn !== undefined && { emailOptIn }),
      });

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      const newFullName = [updated.firstName || '', updated.lastName || ''].filter(Boolean).join(' ') || 'Anonymous';
      if (userId && newFullName !== oldFullName) {
        await storage.updatePrayerAuthorByUser(userId, newFullName);
      }

      const { password, resetToken, resetTokenExpiry, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Post an update to a prayer (author only)
  app.post("/api/prayers/:id/updates", isAuthenticated, async (req: any, res) => {
    try {
      const prayer = await storage.getPrayerById(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      if (prayer.authorId !== req.session.userId) {
        return res.status(403).json({ error: "Only the prayer author can post updates" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Update content is required" });
      }

      const update = await storage.createPrayerUpdate({
        prayerId: req.params.id,
        authorId: req.session.userId,
        content: content.trim(),
      });

      res.json(update);
    } catch (error: any) {
      console.error("Error creating prayer update:", error);
      res.status(500).json({ error: "Failed to create update" });
    }
  });

  // Increment prayer count
  app.post("/api/prayers/:id/pray", async (req, res) => {
    try {
      const prayer = await storage.incrementPrayerCount(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }
      storage.incrementDailyPrayerCount(req.params.id).catch((err) => {
        console.error("[DAILY] Failed to track daily prayer count:", err);
      });
      res.json(prayer);
    } catch (error: any) {
      console.error("Error incrementing prayer count:", error);
      res.status(500).json({ error: "Failed to increment prayer count" });
    }
  });

  // Create donation checkout session
  app.post("/api/create-donation-session", async (req, res) => {
    try {
      const { prayerId, amount = 100, currency = 'eur' } = req.body;
      
      if (!prayerId) {
        return res.status(400).json({ error: "Prayer ID is required" });
      }

      const prayer = await storage.getPrayerById(prayerId);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      const stripe = await getUncachableStripeClient();
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = replitDomain 
        ? `https://${replitDomain}` 
        : `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: 'Support PrayForChange',
                description: "Help support 'Pray For Change' so more people can pray together",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/prayer/${prayer.slug || prayerId}?donated=true`,
        cancel_url: `${baseUrl}/support/${prayerId}`,
        metadata: {
          prayerId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating donation session:", error);
      const isStripeUnavailable = error?.message?.includes('connection not found')
        || error?.message?.includes('not found for repl')
        || error?.message?.includes('STRIPE');
      const message = isStripeUnavailable
        ? "Donations are not available at this time. Please try again later."
        : "Failed to create donation session";
      res.status(503).json({ error: message });
    }
  });

  // Get Stripe publishable key
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      console.error("Error getting Stripe key:", error);
      res.status(500).json({ error: "Failed to get payment configuration" });
    }
  });

  // Update prayer content (aiSummary, recitablePrayer, imageUrl, title)
  app.patch("/api/prayers/:id/content", isAuthenticated, async (req: any, res) => {
    try {
      const { aiSummary, recitablePrayer, imageUrl, title } = req.body;
      const userId = req.session?.userId;
      
      if (aiSummary === undefined && recitablePrayer === undefined && imageUrl === undefined && title === undefined) {
        return res.status(400).json({ error: "No content to update" });
      }

      const prayer = await storage.getPrayerById(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      const isAuthor = prayer.authorId && prayer.authorId === userId;
      const userRecord = userId ? await storage.getUser(userId) : null;
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdmin = userRecord?.email ? adminEmails.includes(userRecord.email.toLowerCase()) : false;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to edit this prayer" });
      }

      let updated = prayer;
      if (title !== undefined) {
        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        if (!trimmedTitle || trimmedTitle.length > 200) {
          return res.status(400).json({ error: "Title must be between 1 and 200 characters" });
        }
        updated = (await storage.updatePrayerTitle(req.params.id, trimmedTitle)) || prayer;
      }
      if (aiSummary !== undefined || recitablePrayer !== undefined) {
        updated = (await storage.updatePrayerContent(req.params.id, { aiSummary, recitablePrayer })) || updated;
      }
      if (imageUrl !== undefined) {
        updated = (await storage.updatePrayerImage(req.params.id, imageUrl)) || updated;
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating prayer content:", error);
      res.status(500).json({ error: "Failed to update prayer content" });
    }
  });

  // Update prayer goal (author or admin only, must be higher than current)
  app.patch("/api/prayers/:id/goal", isAuthenticated, async (req: any, res) => {
    try {
      const { goal } = req.body;
      const userId = req.session?.userId;

      const newGoal = Number(goal);
      if (!Number.isInteger(newGoal) || newGoal < 1) {
        return res.status(400).json({ error: "Goal must be a positive integer" });
      }

      const prayer = await storage.getPrayerById(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      if (newGoal <= prayer.goal) {
        return res.status(400).json({ error: "New goal must be greater than the current goal" });
      }

      const isAuthor = prayer.authorId && prayer.authorId === userId;
      const userRecord = userId ? await storage.getUser(userId) : null;
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdmin = userRecord?.email ? adminEmails.includes(userRecord.email.toLowerCase()) : false;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to update this prayer's goal" });
      }

      const updated = await storage.updatePrayerGoal(req.params.id, newGoal);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating prayer goal:", error);
      res.status(500).json({ error: "Failed to update prayer goal" });
    }
  });

  // Regenerate AI content for a specific prayer
  app.post("/api/prayers/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const { type, instructions } = req.body;
      const userId = req.session?.userId;
      
      if (!type || !['issue', 'prayer', 'both'].includes(type)) {
        return res.status(400).json({ error: "Type must be 'issue', 'prayer', or 'both'" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI service is not configured. Please set OPENAI_API_KEY." });
      }

      const prayer = await storage.getPrayerById(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      const isAuthor = prayer.authorId && prayer.authorId === userId;
      const userRecord = userId ? await storage.getUser(userId) : null;
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdmin = userRecord?.email ? adminEmails.includes(userRecord.email.toLowerCase()) : false;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to edit this prayer" });
      }

      const updates: { aiSummary?: string; recitablePrayer?: string } = {};

      if (type === 'issue' || type === 'both') {
        const summaryPrompt = instructions && prayer.aiSummary
          ? `You are revising a prayer request story based on user feedback.

Current version:
${prayer.aiSummary}

User's instructions for changes:
${instructions}

Please revise the story incorporating these changes while maintaining the heartfelt, first-person tone. Keep it under 125 words. Do NOT include a title or heading. Jump straight into the revised story.`
          : `You are writing a heartfelt prayer request story for a platform similar to Change.org but for prayers.

Title: ${prayer.title}
${prayer.description ? `Personal context: ${prayer.description}` : ''}

Write a compelling story that:
1. Opens with the urgency and importance of this prayer need
2. ${prayer.description ? 'Incorporates the personal context provided' : 'Expands on why this prayer matters'}
3. Calls others to join in prayer
4. Inspires hope and unity

IMPORTANT: Do NOT include a title or heading at the start. Jump straight into the story. Do not use any markdown formatting like ** or ##.

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.

WORD LIMIT: Your response must be 125 words or fewer. Be concise and impactful.`;

        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.8,
        });

        updates.aiSummary = summaryResponse.choices[0].message.content || "";
      }

      if (type === 'prayer' || type === 'both') {
        const prayerPrompt = instructions && prayer.recitablePrayer
          ? `You are revising a community prayer based on user feedback.

Current prayer:
${prayer.recitablePrayer}

User's instructions for changes:
${instructions}

Please revise the prayer incorporating these changes while maintaining the sacred, lyrical free-verse stanza format of the original. Keep it under 170 words. Always end with "May Divine Will be done."

MANDATORY: Your response MUST open with an "Oh [Divine Name]" invocation (e.g. "Oh Wondrous God," or "Oh Mighty God, Creator of Life,") followed on the next line by "We humbly raise our hearts to Thee".`
          : buildRecitablePrayerPrompt(prayer.title, prayer.description);

        const prayerResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prayerPrompt }],
          temperature: 0.7,
        });

        updates.recitablePrayer = ensurePrayerOpening(prayerResponse.choices[0].message.content || "");
      }

      const updatedPrayer = await storage.updatePrayerContent(req.params.id, updates);
      res.json(updatedPrayer);
    } catch (error: any) {
      console.error("Error regenerating prayer content:", error);
      res.status(500).json({ error: "Failed to regenerate content" });
    }
  });

  // Regenerate images for all prayers (admin endpoint)
  app.post("/api/admin/regenerate-images", isAuthenticated, async (req: any, res) => {
    try {
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const userRecord = await storage.getUser(req.session.userId);
      const isAdmin = userRecord?.email ? adminEmails.includes(userRecord.email.toLowerCase()) : false;
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI service is not configured. Please set OPENAI_API_KEY." });
      }
      const allPrayers = await storage.getPrayers();
      const results = [];
      
      for (const prayer of allPrayers) {
        try {
          let imagePrompt: string;
          const topic = prayer.topic?.toLowerCase() || '';
          
          const negativeConstraints = `Absolutely no text, words, letters, numbers, typography, or watermarks. No human faces or recognizable people. No religious symbols of any kind. No low-quality, blurry, or distorted elements.`;

          if (topic.includes('peace') || topic.includes('world')) {
            imagePrompt = `Cinematic digital matte painting reminiscent of Hudson River School landscapes. A vast, mirror-still ocean stretching to the horizon at the golden hour, a single white dove in graceful flight silhouetted against volumetric god rays breaking through towering cumulus clouds. Foreground: smooth tide-pool stones with realistic water caustics and sea foam. Mid-ground: gentle swells reflecting rose gold and amber light. Background: aerial perspective with distant haze in lavender and pale coral. Color palette: warm amber, soft coral, pale lavender, titanium white. Visible atmospheric particulates catching the fading sunlight. Emotional tone: the profound stillness after a storm has passed. ${negativeConstraints}`;
          } else if (topic.includes('health') || topic.includes('healing')) {
            imagePrompt = `Delicate ink-and-watercolor illustration with soft wet-on-wet bleeds. Morning sunlight streams through sheer linen curtains onto a sunlit windowsill overflowing with wildflowers in full bloom — lavender, chamomile, and white peonies. A monarch butterfly with translucent, vein-detailed wings rests on a petal. Foreground: dewdrops on the wooden sill with visible grain texture. Mid-ground: the flower arrangement bathed in warm rim lighting. Background: soft bokeh garden view through the window with diffused overcast luminous highlights. Color palette: warm honey gold, soft sage green, gentle lavender, cream white. Delicate paper texture bleeding through washes. Emotional tone: the tender comfort of being held. ${negativeConstraints}`;
          } else if (topic.includes('family') || topic.includes('marriage')) {
            imagePrompt = `Rich gouache painting with flat graphic shapes and atmospheric depth. Two ancient oak trees growing side by side, their massive root systems visibly intertwined beneath a cross-section of rich earth, their canopies touching to form a natural cathedral arch. Warm golden sunset glows behind them with volumetric light filtering through the shared foliage. Foreground: detailed moss, ferns, and small mushrooms on the forest floor. Mid-ground: the intertwined trunks with realistic bark texture. Background: aerial perspective with distant rolling hills in soft haze. Color palette: rich amber, deep forest green, warm sienna, gold leaf highlights. Emotional tone: enduring love that has weathered every season. ${negativeConstraints}`;
          } else if (topic.includes('employment') || topic.includes('job')) {
            imagePrompt = `Luminous oil painting with visible impasto brushstrokes. A single vibrant green seedling with detailed leaf veins pushing through a crack in weathered concrete, bathed in a dramatic shaft of golden light from above. Foreground: the textured crack with tiny dewdrops and moss. Mid-ground: the seedling catching warm rim lighting with cool ambient fill in the shadows. Background: the concrete gives way to a sunlit path leading toward a warm, glowing horizon with soft atmospheric haze. Color palette: deep charcoal, vibrant viridian green, golden yellow, warm amber. Visible canvas grain and thick paint texture on highlights. Emotional tone: the quiet triumph of persistence against all odds. ${negativeConstraints}`;
          } else if (topic.includes('community')) {
            imagePrompt = `Warm editorial illustration in the style of contemporary picture-book art. A long wooden harvest table set outdoors at golden hour, laden with abundant bread, fruit, and wildflower arrangements. String lights glow warmly overhead between mature elm trees. Foreground: detailed bread texture and scattered petals on the weathered wood surface. Mid-ground: the generous table with warm rim lighting catching steam from fresh food. Background: soft rolling countryside with aerial perspective and evening haze. Color palette: warm sunset orange, soft cream, earthy umber, sage green. Soft diffused lighting with luminous highlights on glass and ceramic. Emotional tone: the deep belonging of a shared meal. ${negativeConstraints}`;
          } else if (topic.includes('faith')) {
            imagePrompt = `Dramatic oil painting with chiaroscuro lighting from a single golden source. A solitary candle flame burning with fierce brightness in deep velvet darkness, its warm light radiating in concentric golden circles. The flame is perfectly reflected in a still pool of dark water below, creating a luminous mirror image. Tiny sparks and embers float upward like earthbound stars. Foreground: the candle base with melted wax texture and visible brushstrokes. Mid-ground: the radiant flame with impasto highlights in titanium white and cadmium yellow. Background: deep indigo darkness with subtle atmospheric particulates catching distant light. Color palette: deep indigo, rich gold, warm amber, soft titanium white. Emotional tone: intimate conviction burning quietly in the dark. ${negativeConstraints}`;
          } else if (topic.includes('education')) {
            imagePrompt = `Ethereal soft-focus photograph with painterly post-processing. An open leather-bound book on a weathered oak desk beside a tall arched window, morning sunlight casting long warm shadows across the pages. A cup of steaming tea sends delicate wisps of vapor into the light beams. A small potted fern unfurls a new frond beside a brass desk lamp. Foreground: book pages with visible paper texture and soft focus on the nearest edge. Mid-ground: the warm pool of sunlight on the desk with volumetric dust motes. Background: a garden view through the window with soft bokeh greens and morning dew. Color palette: warm honey, antique cream, soft raw umber, muted sage green. Emotional tone: the quiet wonder of a mind about to open. ${negativeConstraints}`;
          } else if (topic.includes('gratitude')) {
            imagePrompt = `Cinematic digital matte painting with painterly textures. A breathtaking sunrise over a perfectly still mountain lake, the sky ablaze in graduating bands of color. Foreground: a meadow of wildflowers — lupines, poppies, and daisies — covered in morning dew with realistic water droplets catching prismatic light. Mid-ground: the glassy lake surface reflecting the sky with true-to-life water caustics. Background: snow-capped peaks emerging from delicate morning mist with aerial perspective. A flock of birds rises from the lake's edge into the luminous sky. Color palette: rose gold, soft peach, lavender, warm titanium white. Atmospheric particulates creating visible god rays. Emotional tone: the overwhelming gratitude of witnessing something sacred. ${negativeConstraints}`;
          } else {
            imagePrompt = `Luminous oil painting with visible impasto brushstrokes reminiscent of Hudson River School landscapes. A winding forest path through towering ancient trees, dappled sunlight filtering through a cathedral-like canopy of emerald and gold leaves. The path curves gently toward a warm, luminous clearing in the distance. Foreground: detailed moss-covered roots, fallen autumn leaves with visible veins, and tiny wildflowers lining the path edges. Mid-ground: the path bathed in alternating pools of warm sunlight and cool shadow. Background: the glowing clearing with soft atmospheric haze and volumetric god rays. Color palette: emerald green, warm gold leaf, soft amber, earthy raw umber. Visible brushstrokes and canvas texture throughout. Emotional tone: the contemplative courage of choosing a new direction. ${negativeConstraints}`;
          }

          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            size: "1792x1024",
            quality: "hd",
            n: 1,
          });

          const newImageUrl = imageResponse.data?.[0]?.url || "";
          
          if (newImageUrl) {
            await storage.updatePrayerImage(prayer.id, newImageUrl);
            results.push({ id: prayer.id, title: prayer.title, status: "success" });
          }
        } catch (imgError: any) {
          results.push({ id: prayer.id, title: prayer.title, status: "failed", error: imgError.message });
        }
      }
      
      res.json({ message: "Image regeneration complete", results });
    } catch (error: any) {
      console.error("Error regenerating images:", error);
      res.status(500).json({ error: "Failed to regenerate images" });
    }
  });

  // Admin: manually trigger the daily crisis prayer pipeline (awaited — may take 2-3 min)
  app.post("/api/admin/run-daily-prayer", isAuthenticated, async (req: any, res) => {
    try {
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      const userRecord = await storage.getUser(req.session.userId);
      const isAdmin = userRecord?.email ? adminEmails.includes(userRecord.email.toLowerCase()) : false;
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const { runPipeline } = await import("../scripts/daily-prayer.js");

      console.log("[ADMIN RUN-NOW] Starting pipeline...");
      const result = await runPipeline();
      console.log("[ADMIN RUN-NOW] Pipeline finished:", result.status);

      return res.json(result);
    } catch (err: any) {
      console.error("[admin/run-daily-prayer] Unexpected error:", err);
      return res.status(500).json({ status: "error", error: "Failed to run pipeline: " + (err?.message || "unknown error") });
    }
  });

  // One-time seed: insert dev-created crisis prayers into whichever DB this server is running against
  // Protected by admin email check. Safe to call multiple times — skips duplicates by slug.
  app.post("/api/admin/seed-crisis-prayers", async (req, res) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    const user = (req as any).user;
    if (!user || !adminEmails.includes(user.email)) {
      return res.status(403).json({ error: "Admin only" });
    }

    const seedPrayers = [
      {
        id: '63b71af4-c5bb-4124-8729-66b1f6e91981',
        slug: 'pray-for-ugandas-ebola-frontline-communities',
        title: "Pray for Uganda's Ebola Frontline Communities",
        description: "Uganda is battling an Ebola outbreak that has also spread to the neighbouring Democratic Republic of the Congo. Health workers on the frontlines are confronting not only a deadly virus but also the invisible forces of fear, misinformation, and social stigma that threaten to tear communities apart. Families affected by Ebola face isolation and rejection, making recovery and containment even more challenging.\n\nBehind every case are mothers, children, health workers, and entire villages navigating grief, uncertainty, and the courage required to care for the sick. We pray for every soul caught in this crisis—for healing, for truth to overcome fear, and for communities to be made whole again.\n\nPhoto via news.un.org",
        aiSummary: "In July 2026, brave health workers recommenced their work in western Uganda, where efforts to recover from an Ebola outbreak were gaining momentum. They returned to stricken villages, offering essential support to survivors and marching forward in a compassionate effort to rebuild trust among families and neighbours. UN News and WHO confirmed substantial progress being made in the region's recovery endeavours.\n\nThe impact of these efforts is profound — health workers and volunteers are breathing life back into affected areas. Their compassionate presence ignites hope and fortifies the spirit of resilience within individuals and communities. By helping families rebuild bonds and encouraging collective healing, these interventions lay the foundation for a brighter tomorrow. Inspired by their determination, we gather in prayer, embracing the Divine spirit to envelop all those steadfastly working toward wholeness and peace.",
        recitablePrayer: "Oh Divine Healer, Source of All Compassion,\nWe invoke Thy radiant healing Light\nUpon the people of Uganda and the Democratic Republic of the Congo.\nMay Thy Power flow now to every soul touched by this sickness,\nRestoring body, mind, and spirit to wholeness.\nMay those who lie ill feel Thy healing Presence,\nTheir strength renewed, their recovery swift and complete.\nMay this outbreak be brought to an end,\nAnd health return to every village, every home, every family.\nMay Thy Light surround the children, the mothers, the elders,\nFilling them with comfort, courage, and peace.\nMay those who grieve be held in Thy infinite Love,\nAnd those who have been kept apart be reunited in joy.\n\nOh Gracious Provider, Sustainer of Life,\nBless the healers and helpers who give of themselves each day.\nGuide their hands, protect their spirits, and magnify their every effort,\nSo that Thy healing may move through them freely.\nMay truth and understanding shine throughout these lands,\nAnd may every community be drawn together in compassion,\nWhole, strong, and at peace once more.\n\nWe thank Thee, Oh Eternal Source of Healing,\nFor allowing us to be channels\nFor Thy Divine Power and Love to flow out into our world.\nMay Thy Will always and forever be done.",
        imageUrl: '/assets/daily-prayer-2026-07-07-16c4d5d4.jpg',
        count: 5579,
        createdAt: new Date('2026-07-07T08:55:53.587Z'),
      },
      {
        id: '49338fd3-dd38-46a8-9024-8804fbccb23e',
        slug: 'for-those-affected-by-floods-in-south-australia',
        title: "For Those Affected by Floods in South Australia",
        description: "Severe storms and flash flooding swept South Australia in July 2026, prompting hundreds of emergency rescues and widespread clean-up efforts across the state.",
        aiSummary: "In early July 2026, severe storms unleashed flash flooding across South Australia, with low-lying areas particularly devastated as floodwaters inundated streets and cut off communities. The State Emergency Service worked through the night, responding to hundreds of urgent calls for help. In one dramatic rescue operation, emergency workers saved a man from the roof of his vehicle after he had attempted to drive through rising floodwaters—a stark reminder of the danger these conditions pose.\n\nFamilies throughout the affected regions watched helplessly as their homes filled with water, while elderly residents and vulnerable community members faced frightening isolation. Yet amid the destruction, the human spirit shone through: volunteers waded into floodwaters, neighbours sheltered those who had lost everything, and emergency responders risked their lives repeatedly to save others. This prayer asks for divine light to shine upon all those affected by this disaster, and for strength to flow through every person offering aid and compassion.",
        recitablePrayer: "Oh Eternal Source of Light, Creator of all that is,\nWe come before Thee with heavy hearts,\nAs severe storms and flash flooding sweep across South Australia,\nWashing away homes, roads, and the security of Thy children,\nLeaving families stranded, communities divided,\nAnd hearts trembling with fear and loss.\n\nMay Thy radiant Light fall upon the children,\nWhose eyes have witnessed waters rising in the night,\nUpon the families whose homes now stand in ruin,\nUpon the elderly, vulnerable and alone,\nAnd upon all those who have lost their shelter,\nTheir belongings, their sense of safety in this world.\n\nOh Compassionate One, may Thy strength flow to all those who bring aid—\nTo the State Emergency Service workers labouring through darkness,\nTo the volunteers wading through floodwaters to reach the stranded,\nTo the neighbours who open their doors to those with nowhere to go,\nAnd to the rescuers who pulled a man from his vehicle's roof,\nRisking their own lives that another might live.\n\nMay this crisis awaken in all humanity\nA deeper knowing of our sacred connection,\nThat we might reach across every boundary\nWith hands of compassion and hearts of service,\nSeeing in each flooded street a call to love more greatly,\nIn each rescue a reminder of our shared vulnerability and strength.\n\nWe thank Thee, Oh Divine Presence,\nFor allowing us to be channels\nFor Thy Divine Power and Love to flow out into our world,\nThat through our prayers, our actions, and our compassion,\nHealing may come to South Australia and all who suffer.\nMay Thy Will always and forever be done.",
        imageUrl: '/assets/daily-prayer-2026-07-04-50cc2883.jpg',
        count: 3569,
        createdAt: new Date('2026-07-04T11:33:19.836Z'),
      },
    ];

    const results: string[] = [];
    for (const p of seedPrayers) {
      try {
        const existing = await storage.getPrayerBySlug(p.slug);
        if (existing) {
          results.push(`SKIPPED (already exists): ${p.title}`);
          continue;
        }
        await storage.createPrayerWithId({
          id: p.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          aiSummary: p.aiSummary,
          recitablePrayer: p.recitablePrayer,
          imageUrl: p.imageUrl,
          author: 'Daily Crisis Prayer',
          count: p.count,
          goal: 10000,
          topic: 'World Peace',
          flaggedForReview: false,
          isDailyCrisisPrayer: true,
          approvalStatus: 'published',
          createdAt: p.createdAt,
        });
        results.push(`INSERTED: ${p.title}`);
      } catch (err: any) {
        results.push(`ERROR for ${p.title}: ${err?.message}`);
      }
    }

    return res.json({ results });
  });

  // RSS feed — Daily Crisis Prayers
  app.get("/api/rss/daily-crisis.xml", async (req, res) => {
    console.log("[RSS] Route hit, starting generation");
    try {
      const SITE_URL = process.env.SITE_URL || 'https://prayforchange.org';
      console.log("[RSS] Fetching prayers from storage");
      const prayers = await storage.getPublishedDailyCrisisPrayers(50);
      console.log("[RSS] Got", prayers.length, "prayers");

      const escapeXml = (s: string | null | undefined): string => {
        if (s == null) return '';
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const toAbsoluteUrl = (url: string) =>
        url.startsWith('http') ? url : `${SITE_URL}${url}`;

      const items = prayers.map((p, i) => {
        try {
          console.log(`[RSS] Mapping prayer ${i}: ${p.id}`);
          const link = `${SITE_URL}/prayer/${p.slug || p.id}`;
          const pubDate = p.createdAt ? new Date(p.createdAt).toUTCString() : new Date().toUTCString();
          const description = p.aiSummary || p.description || '';
          const imageUrl = p.imageUrl ? toAbsoluteUrl(p.imageUrl) : null;

          const enclosure = imageUrl
            ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />`
            : '';

          const mediaThumbnail = imageUrl
            ? `<media:thumbnail url="${escapeXml(imageUrl)}" />`
            : '';

          const content = [
            imageUrl ? `<img src="${escapeXml(imageUrl)}" alt="${escapeXml(p.title)}" style="max-width:100%;display:block;margin-bottom:16px;" />` : '',
            description ? `<p>${escapeXml(description)}</p>` : '',
            p.recitablePrayer ? `<blockquote><em>${escapeXml(p.recitablePrayer)}</em></blockquote>` : '',
            `<p><a href="${escapeXml(link)}">Pray with the community →</a></p>`,
          ].filter(Boolean).join('\n');

          return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      ${enclosure}
      ${mediaThumbnail}
    </item>`;
        } catch (itemErr: any) {
          console.error(`[RSS] Error mapping prayer ${i} (${p.id}):`, itemErr?.message, itemErr?.stack);
          return '';
        }
      }).filter(Boolean).join('\n');
      console.log("[RSS] Map complete, building XML");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PrayForChange — Daily Crisis Prayer</title>
    <link>${SITE_URL}/daily-crisis</link>
    <description>Every morning, an interfaith prayer for the world&#39;s most urgent crisis.</description>
    <language>en-us</language>
    <ttl>360</ttl>
    <atom:link href="${SITE_URL}/api/rss/daily-crisis.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (error: any) {
      console.error("Error generating RSS feed:", error?.message || error, error?.stack);
      res.status(500).set('Content-Type', 'application/rss+xml').send(`<?xml version="1.0"?><error>${error?.message || 'Unknown error'}</error>`);
    }
  });

  // Report policy violation
  app.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(validatedData);
      
      try {
        const prayer = await storage.getPrayerById(validatedData.prayerId);
        console.log(`[REPORT] Policy violation reported for prayer: ${prayer?.title || validatedData.prayerId}`);
      } catch (emailError) {
        console.error("Failed to log report:", emailError);
      }
      
      res.status(201).json({ message: "Report submitted successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid report data", details: error.errors });
      }
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  return httpServer;
}
