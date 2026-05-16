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

function injectTitle(html: string, title: string): string {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
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
  if (html.includes('canonical')) {
    return html.replace(/<link[^>]*rel="canonical"[^>]*>/, tag);
  }
  return html.replace("</head>", `  ${tag}\n  </head>`);
}

const HOW_TO_PRAY_DESCRIPTION =
  "Learn how prayer works as a practical force for change. PrayForChange guides you through a simple, interfaith approach to directing spiritual energy toward the people and causes that need it most.";

const PRAYER_FALLBACK_DESCRIPTION =
  "Join thousands of people praying for this cause on PrayForChange.org \u2014 the world\u2019s platform for collective spiritual support.";

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  Health: {
    title: "Health Prayers \u2014 Pray Together for Healing | PrayForChange.org",
    description: "Join the community in prayer for healing and health. Browse prayer requests for illness, recovery, and wellbeing from people around the world.",
  },
  Family: {
    title: "Family Prayers \u2014 Pray for Your Loved Ones | PrayForChange.org",
    description: "Find prayers for family relationships, marriage, parenting, and the people closest to your heart. Join thousands praying together.",
  },
  Employment: {
    title: "Employment Prayers \u2014 Pray for Work & Provision | PrayForChange.org",
    description: "Browse prayer requests for jobs, careers, financial provision, and economic breakthrough. Stand with those seeking God\u2019s guidance in their work.",
  },
  "World Peace": {
    title: "Prayers for World Peace \u2014 Pray for Nations | PrayForChange.org",
    description: "Join thousands praying for peace, conflict resolution, and justice in the world\u2019s most troubled places. Collective prayer for global healing.",
  },
  Community: {
    title: "Community Prayers \u2014 Pray for Your Neighbours | PrayForChange.org",
    description: "Browse prayers for local communities, neighbourhoods, and the people around us. Prayer that builds up the world one community at a time.",
  },
  Faith: {
    title: "Faith Prayers \u2014 Strengthen Your Spiritual Life | PrayForChange.org",
    description: "Find prayers for deeper faith, spiritual growth, and connection with God. Join a global community seeking spiritual renewal together.",
  },
  Education: {
    title: "Education Prayers \u2014 Pray for Students & Schools | PrayForChange.org",
    description: "Browse prayer requests for students, teachers, and educational institutions. Support the next generation through the power of collective prayer.",
  },
  Gratitude: {
    title: "Prayers of Gratitude \u2014 Give Thanks Together | PrayForChange.org",
    description: "Join the community in prayers of thanksgiving, blessing, and gratitude to God. Celebrate answered prayers and everyday grace.",
  },
  General: {
    title: "General Prayer Requests \u2014 Community Prayers | PrayForChange.org",
    description: "Browse a wide range of prayer requests from the PrayForChange community. Every prayer is an invitation for others to stand with you.",
  },
};

export async function injectPrayerOgTags(
  html: string,
  urlPath: string,
): Promise<string> {
  const baseUrl = getBaseUrl().replace(/\/+$/, "");
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const normalizedPath = cleanPath === "/" ? "/" : cleanPath.replace(/\/+$/, "");
  const canonicalUrl = `${baseUrl}${normalizedPath}`;
  html = injectCanonical(html, canonicalUrl);

  if (normalizedPath === "/") {
    const organizationSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "PrayForChange",
      "url": "https://prayforchange.org",
      "logo": "https://prayforchange.org/favicon.png",
      "description": "PrayForChange is a global platform for collective prayer. Share your burden and turn one prayer into thousands. People from over 190 countries pray together for the world's most pressing needs.",
      "sameAs": [],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@prayforchange.org",
        "contactType": "customer support",
      },
    }, null, 2);
    const websiteSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "PrayForChange",
      "url": "https://prayforchange.org",
    }, null, 2);
    const faqSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is PrayForChange?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "PrayForChange is a global platform where anyone can start a prayer for a person, a cause, or a world event \u2014 and invite others to pray alongside them. It is interfaith and open to everyone, regardless of tradition or belief.",
          },
        },
        {
          "@type": "Question",
          "name": "How does collective prayer work on this platform?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You describe what you want the world to pray for. Our AI generates a prayer in a universalist, interfaith style. Others can then click 'I prayed for this' to join you. You can see how many people across the world are praying for the same intention.",
          },
        },
        {
          "@type": "Question",
          "name": "Is PrayForChange interfaith?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. PrayForChange is designed for people of all faith traditions \u2014 Christian, Muslim, Jewish, Hindu, Buddhist, and anyone who believes in the power of prayer or spiritual intention. The prayers are written in an inclusive style that speaks to the shared spiritual values across traditions.",
          },
        },
        {
          "@type": "Question",
          "name": "Do I need to create an account to pray?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can pray for others without creating an account. To start your own prayer request and track how many people are praying for it, you will need to sign in.",
          },
        },
        {
          "@type": "Question",
          "name": "Is PrayForChange free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, PrayForChange is completely free.",
          },
        },
      ],
    }, null, 2);
    const scripts =
      `  <script type="application/ld+json">\n${organizationSchema}\n  </script>\n` +
      `  <script type="application/ld+json">\n${websiteSchema}\n  </script>\n` +
      `  <script type="application/ld+json">\n${faqSchema}\n  </script>\n`;
    html = html.replace("</head>", `${scripts}</head>`);
  }

  if (urlPath.startsWith("/how-to-pray")) {
    html = injectTitle(html, "How To Pray | PrayForChange.org");
    return injectMetaDescription(html, escapeHtml(HOW_TO_PRAY_DESCRIPTION));
  }

  if (normalizedPath === "/browse") {
    const queryStr = urlPath.includes("?") ? urlPath.split("?")[1] : "";
    const topic = new URLSearchParams(queryStr).get("topic") || "";
    const categoryMeta = topic && CATEGORY_META[topic] ? CATEGORY_META[topic] : null;

    if (categoryMeta) {
      const topicCanonical = `${baseUrl}/browse?topic=${encodeURIComponent(topic)}`;
      html = injectCanonical(html, topicCanonical);
      html = injectTitle(html, escapeHtml(categoryMeta.title));
      html = injectMetaDescription(html, escapeHtml(categoryMeta.description));
    } else {
      html = injectTitle(html, "Browse All Prayers | PrayForChange.org");
      html = injectMetaDescription(
        html,
        "Explore prayer requests from communities around the world. Browse by category \u2014 health, family, world peace, and more. Join in prayer for the causes that matter most.",
      );
    }
    return html;
  }

  if (normalizedPath === "/terms") {
    html = injectTitle(html, "Terms of Service | PrayForChange.org");
    return injectMetaDescription(
      html,
      "Read the Terms of Service for PrayForChange.org \u2014 the global community prayer platform.",
    );
  }

  if (normalizedPath === "/privacy") {
    html = injectTitle(html, "Privacy Policy | PrayForChange.org");
    return injectMetaDescription(
      html,
      "Read the Privacy Policy for PrayForChange.org. Learn how we handle your data and protect your privacy.",
    );
  }

  const match = urlPath.match(/^\/prayer\/([a-z0-9-]+)/i);
  if (!match) return html;

  const prayerSlugOrId = match[1];

  try {
    const prayer = await storage.getPrayerBySlugOrId(prayerSlugOrId);
    if (!prayer) return html;

    const ogTitle = escapeHtml(prayer.title);
    const rawDesc = prayer.aiSummary || prayer.description || "";
    const ogDescription = escapeHtml(truncateText(rawDesc.replace(/\n+/g, " ").trim(), 200));
    const ogImage = resolveImageUrl(prayer.imageUrl);
    const ogUrl = `${baseUrl}/prayer/${prayer.slug || prayer.id}`;

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

    const articleBody = (prayer.aiSummary || prayer.description || "").trim();
    const topic = prayer.topic || "General";
    const topicLabel = CATEGORY_META[topic] ? `${topic} Prayers` : "Community Prayers";

    const breadcrumbSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": topicLabel,
          "item": `${baseUrl}/browse?topic=${encodeURIComponent(topic)}`,
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": prayer.title,
          "item": ogUrl,
        },
      ],
    }, null, 2);

    const articleSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": prayer.title,
      "articleBody": articleBody,
      "url": ogUrl,
      "datePublished": prayer.createdAt.toISOString(),
      "author": {
        "@type": "Person",
        "name": prayer.author || "Anonymous",
      },
      "publisher": {
        "@type": "Organization",
        "name": "PrayForChange",
        "url": "https://prayforchange.org",
      },
      "interactionStatistic": {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": prayer.count,
      },
      ...(prayer.imageUrl ? { "image": resolveImageUrl(prayer.imageUrl) } : {}),
    }, null, 2);

    html = html.replace(
      "</head>",
      `  <script type="application/ld+json">\n${breadcrumbSchema}\n  </script>\n  <script type="application/ld+json">\n${articleSchema}\n  </script>\n</head>`,
    );

    return html;
  } catch (error) {
    console.error("[OG] Failed to inject prayer OG tags:", error);
    return html;
  }
}
