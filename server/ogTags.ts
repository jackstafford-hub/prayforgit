import { storage } from "./storage";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getBaseUrl(): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  const domains = process.env.REPLIT_DOMAINS?.split(",");
  if (domains && domains.length > 0) {
    return `https://${domains[0]}`;
  }
  return "https://prayforchange.org";
}

function resolveImageUrl(imageUrl: string | null): string {
  const baseUrl = getBaseUrl();
  const defaultImage = `${baseUrl}/assets/og_default_prayforchange.png`;

  if (!imageUrl) return defaultImage;
  if (imageUrl.startsWith("http")) return imageUrl;
  if (imageUrl.startsWith("/")) return `${baseUrl}${imageUrl}`;
  return defaultImage;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1).trimEnd() + "\u2026";
}

export async function injectPrayerOgTags(
  html: string,
  urlPath: string,
): Promise<string> {
  const match = urlPath.match(/^\/prayer\/([a-f0-9-]+)/i);
  if (!match) return html;

  const prayerId = match[1];

  try {
    const prayer = await storage.getPrayerById(prayerId);
    if (!prayer) return html;

    const baseUrl = getBaseUrl();
    const ogTitle = escapeHtml(prayer.title);
    const rawDesc = prayer.aiSummary || prayer.description || "";
    const ogDescription = escapeHtml(truncateText(rawDesc.replace(/\n+/g, " ").trim(), 200));
    const ogImage = resolveImageUrl(prayer.imageUrl);
    const ogUrl = `${baseUrl}/prayer/${prayer.id}`;

    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${ogTitle} - PrayForChange.org</title>`,
    );
    html = html.replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${ogTitle}" />`,
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${ogDescription}" />`,
    );
    html = html.replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${ogImage}" />`,
    );
    html = html.replace(
      /<meta property="og:type" content="[^"]*" \/>/,
      `<meta property="og:type" content="article" />`,
    );
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${ogTitle}" />`,
    );
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${ogDescription}" />`,
    );
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${ogImage}" />`,
    );

    if (html.includes('og:url')) {
      html = html.replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${ogUrl}" />`,
      );
    } else {
      html = html.replace(
        /<meta property="og:type"/,
        `<meta property="og:url" content="${ogUrl}" />\n    <meta property="og:type"`,
      );
    }

    return html;
  } catch (error) {
    console.error("[OG] Failed to inject prayer OG tags:", error);
    return html;
  }
}
