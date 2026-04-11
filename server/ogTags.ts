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

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.substring(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > 0 ? slice.substring(0, lastSpace) : slice;
}

function injectMetaDescription(html: string, description: string): string {
  const tag = `<meta name="description" content="${description}" />`;
  if (html.includes('name="description"')) {
    return html.replace(/<meta name="description" content="[^"]*" \/>/, tag);
  }
  return html.replace(/<meta property="og:title"/, `${tag}\n    <meta property="og:title"`);
}

function injectCanonical(html: string, canonicalUrl: string): string {
  const tag = `<link rel="canonical" href="${canonicalUrl}" />`;
  if (html.includes('rel="canonical"')) {
    return html.replace(/<link rel="canonical" href="[^"]*" \/>/, tag);
  }
  return html.replace("</head>", `  ${tag}\n  </head>`);
}

const HOW_TO_PRAY_DESCRIPTION =
  "Learn how prayer works as a practical force for change. PrayForChange guides you through a simple, interfaith approach to directing spiritual energy toward the people and causes that need it most.";

const PRAYER_FALLBACK_DESCRIPTION =
  "Join thousands of people praying for this cause on PrayForChange.org \u2014 the world's platform for collective spiritual support.";

export async function injectPrayerOgTags(
  html: string,
  urlPath: string,
): Promise<string> {
  const baseUrl = getBaseUrl();
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const normalizedPath = cleanPath === "/" ? "/" : cleanPath.replace(/\/+$/, "");
  const canonicalUrl = `${baseUrl}${normalizedPath}`;
  html = injectCanonical(html, canonicalUrl);

  if (urlPath.startsWith("/how-to-pray")) {
    return injectMetaDescription(html, escapeHtml(HOW_TO_PRAY_DESCRIPTION));
  }

  const match = urlPath.match(/^\/prayer\/([a-f0-9-]+)/i);
  if (!match) return html;

  const prayerId = match[1];

  try {
    const prayer = await storage.getPrayerById(prayerId);
    if (!prayer) return html;

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

    const storyText = (prayer.description || "").replace(/\n+/g, " ").trim();
    const metaDesc = storyText
      ? escapeHtml(truncateAtWordBoundary(storyText, 140)) + " \u2014 PrayForChange.org"
      : PRAYER_FALLBACK_DESCRIPTION;
    html = injectMetaDescription(html, metaDesc);

    return html;
  } catch (error) {
    console.error("[OG] Failed to inject prayer OG tags:", error);
    return html;
  }
}
