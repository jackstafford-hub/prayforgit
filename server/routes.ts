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
import { sendPrayerSavedEmail, sendAdminPrayerCopyEmail, sendModerationEmail } from "./emailService";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve static assets from attached_assets/generated_images
  const assetsPath = path.resolve(process.cwd(), "attached_assets/generated_images");
  app.use("/assets", express.static(assetsPath));
  
  // Setup authentication
  await setupAuth(app);


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
- Contains hateful, vengeful, or violent language
- Wishes harm or misfortune on others
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
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const result = JSON.parse(content);
      res.json({ isNegative: !!result.isNegative, suggestion: result.suggestion || undefined });
    } catch (error) {
      console.error("Error checking prayer tone:", error);
      res.json({ isNegative: false });
    }
  });

  // Generate prayer content using OpenAI (text only - fast)
  app.post("/api/generate-prayer", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!openai) {
        return res.status(503).json({ error: "AI service is not configured. Please set OPENAI_API_KEY." });
      }

      // Generate AI summary and prayer in parallel
      const summaryPrompt = `You are writing a heartfelt prayer request story for a platform similar to Change.org but for prayers.

Title: ${title}
${description ? `Personal context: ${description}` : ''}

Write a compelling 3-4 paragraph story that:
1. Opens with the urgency and importance of this prayer need
2. ${description ? 'Incorporates the personal context provided' : 'Expands on why this prayer matters'}
3. Calls others to join in prayer
4. Inspires hope and unity

IMPORTANT: Do NOT include a title or heading at the start. Jump straight into the story. Do not use any markdown formatting like ** or ##.

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.`;

      const prayerPrompt = `Write a beautiful, structured prayer for a community to recite together for: ${title}
${description ? `Context: ${description}` : ''}

You MUST closely follow this exact prayer template, using similar terminology and phrases:

---
Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring peace and harmony to Ukraine
And healing and protection to
All the people who are injured and suffering in this
War-torn country.

Oh Divine Father of Life,
May Thy wondrous power flood this country now
Bringing hope wherever it touches,
Healing to the sick and wounded,
And strength to those who have suffered great loss.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring peace,
To inspire them in their difficult work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed aid of every kind flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.
---

CRITICAL INSTRUCTIONS - Follow these EXACTLY:

1. USE THESE EXACT PHRASES (adapt to context):
   - "We ask that we may be used as Channels"
   - "Thy vibrant Healing Power to flow through us"
   - "In a living stream of radiant loving energy"
   - "May Thy wondrous power flood" 
   - "Bringing hope wherever it touches"
   - "May they all be comforted by Thy Presence"
   - "We pray that Thy Loving power flows to all"
   - "With clarity, wisdom, love, understanding"
   - "In the realization that we are one human family"
   - "Sharing in our grief and in our joy"
   - "we thank you for this opportunity to be of Service"
   - "May Thy Will be Done"

2. USE THESE DIVINE ADDRESSES:
   - "Oh Mighty God, Creator of Life" (first stanza)
   - "Oh Divine Father of Life" (second stanza)
   - "Oh Divine Creator" (final stanza)
   - "Oh God" can be used within stanzas

3. STRUCTURE: Exactly 4 stanzas following the template structure

4. FORMAT: Each new sentence or phrase that starts with a capital letter should be on its own line

5. ADAPT the specific issue/person/situation into the prayer while keeping the spiritual language intact

6. Always end with "May Thy Will be Done."

Do NOT include a title. Start directly with "Oh Mighty God, Creator of Life,"`;

      // Run both GPT calls in parallel for speed
      const [summaryResponse, prayerResponse] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.8,
        }),
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prayerPrompt }],
          temperature: 0.7,
        })
      ]);

      const aiSummary = summaryResponse.choices[0].message.content || "";
      const recitablePrayer = prayerResponse.choices[0].message.content || "";

      // Return text immediately without waiting for image
      res.json({
        aiSummary,
        recitablePrayer,
        imageUrl: "", // Image will be generated separately
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
          content: `You are an expert art director who writes prompts for AI image generation. You create prompts that produce museum-quality, emotionally evocative artwork. Your prompts always specify:

1. ARTISTIC STYLE: Choose a specific style for each prompt (e.g., "soft watercolor illustration", "dramatic oil painting", "impressionist painting", "digital art with painterly textures", "warm gouache illustration"). Vary the style based on the mood.
2. COMPOSITION: Describe foreground, midground, and background elements. Use depth of field and perspective.
3. LIGHTING: Be specific — "warm golden hour backlight", "soft diffused morning light filtering through trees", "dramatic sunset with long shadows", "ethereal glow from within".
4. COLOR PALETTE: Name 3-4 dominant colors (e.g., "warm amber, soft sage green, and dusty rose tones").
5. MOOD/ATMOSPHERE: Describe the emotional feeling — "peaceful and contemplative", "bittersweet but hopeful", "quietly powerful".
6. SYMBOLIC IMAGERY: Use metaphorical objects from nature — candles, birds in flight, roots intertwining, paths through forests, seeds sprouting, light breaking through clouds, calm water reflecting sky.

STRICT RULES — always include these in your prompt:
- NO text, words, letters, or typography of any kind
- NO human faces or recognizable people (hands and silhouettes from behind are acceptable)
- NO religious symbols (no crosses, stars of David, crescents, etc.)
- NO blurry or low-quality elements
- Focus on nature, light, symbolic objects, and abstract emotional imagery`
        }, {
          role: "user",
          content: `Create a DALL-E image prompt for this prayer request. Respond with ONLY the prompt, nothing else.

Title: ${title}
${aiSummary ? `Content: ${aiSummary.substring(0, 500)}` : ''}`
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
  app.get("/api/prayers", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const publicPrayers = await storage.getPublicPrayers();
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
      console.error("Error fetching user prayers:", error);
      res.status(500).json({ error: "Failed to fetch user prayers" });
    }
  });

  // Get prayer by ID
  app.get("/api/prayers/:id", async (req, res) => {
    try {
      const prayer = await storage.getPrayerById(req.params.id);
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
      const prayerData = {
        ...validatedData,
        authorId: userId || null,
      };
      
      const prayer = await storage.createPrayer(prayerData);

      const prayerContent = prayer.recitablePrayer || prayer.aiSummary || prayer.description || '';

      if (userId) {
        const user = await storage.getUser(userId);
        if (user?.email) {
          sendPrayerSavedEmail(user.email, user.firstName || 'Friend', prayer.title, prayerContent).catch(() => {});
        }
      }

      const authorName = prayer.author || 'Anonymous';

      if (prayer.flaggedForReview) {
        sendModerationEmail(prayer.title, prayer.description || '', prayerContent, authorName, toneSuggestion).catch(() => {});
      } else {
        sendAdminPrayerCopyEmail(prayer.title, prayer.description || '', prayerContent, authorName).catch(() => {});
      }

      res.status(201).json(prayer);
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
        success_url: `${baseUrl}/prayer/${prayerId}?donated=true`,
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

  // Update prayer content (aiSummary, recitablePrayer)
  app.patch("/api/prayers/:id/content", isAuthenticated, async (req: any, res) => {
    try {
      const { aiSummary, recitablePrayer } = req.body;
      const userId = req.session?.userId;
      
      if (aiSummary === undefined && recitablePrayer === undefined) {
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

      const updated = await storage.updatePrayerContent(req.params.id, { aiSummary, recitablePrayer });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating prayer content:", error);
      res.status(500).json({ error: "Failed to update prayer content" });
    }
  });

  // Regenerate AI content for a specific prayer
  app.post("/api/prayers/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.body;
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
        const summaryPrompt = `You are writing a heartfelt prayer request story for a platform similar to Change.org but for prayers.

Title: ${prayer.title}
${prayer.description ? `Personal context: ${prayer.description}` : ''}

Write a compelling 3-4 paragraph story that:
1. Opens with the urgency and importance of this prayer need
2. ${prayer.description ? 'Incorporates the personal context provided' : 'Expands on why this prayer matters'}
3. Calls others to join in prayer
4. Inspires hope and unity

IMPORTANT: Do NOT include a title or heading at the start. Jump straight into the story. Do not use any markdown formatting like ** or ##.

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.`;

        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.8,
        });

        updates.aiSummary = summaryResponse.choices[0].message.content || "";
      }

      if (type === 'prayer' || type === 'both') {
        const prayerPrompt = `Write a beautiful, structured prayer for a community to recite together for: ${prayer.title}
${prayer.description ? `Context: ${prayer.description}` : ''}

You MUST closely follow this exact prayer template, using similar terminology and phrases:

---
Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring peace and harmony to Ukraine
And healing and protection to
All the people who are injured and suffering in this
War-torn country.

Oh Divine Father of Life,
May Thy wondrous power flood this country now
Bringing hope wherever it touches,
Healing to the sick and wounded,
And strength to those who have suffered great loss.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring peace,
To inspire them in their difficult work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed aid of every kind flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.
---

CRITICAL INSTRUCTIONS - Follow these EXACTLY:

1. USE THESE EXACT PHRASES (adapt to context):
   - "We ask that we may be used as Channels"
   - "Thy vibrant Healing Power to flow through us"
   - "In a living stream of radiant loving energy"
   - "May Thy wondrous power flood" 
   - "Bringing hope wherever it touches"
   - "May they all be comforted by Thy Presence"
   - "We pray that Thy Loving power flows to all"
   - "With clarity, wisdom, love, understanding"
   - "In the realization that we are one human family"
   - "Sharing in our grief and in our joy"
   - "we thank you for this opportunity to be of Service"
   - "May Thy Will be Done"

2. USE THESE DIVINE ADDRESSES:
   - "Oh Mighty God, Creator of Life" (first stanza)
   - "Oh Divine Father of Life" (second stanza)
   - "Oh Divine Creator" (final stanza)
   - "Oh God" can be used within stanzas

3. STRUCTURE: Exactly 4 stanzas following the template structure

4. FORMAT: Each new sentence or phrase that starts with a capital letter should be on its own line

5. ADAPT the specific issue/person/situation into the prayer while keeping the spiritual language intact

6. Always end with "May Thy Will be Done."

Do NOT include a title. Start directly with "Oh Mighty God, Creator of Life,"`;

        const prayerResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prayerPrompt }],
          temperature: 0.7,
        });

        updates.recitablePrayer = prayerResponse.choices[0].message.content || "";
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
          
          if (topic.includes('peace') || topic.includes('world')) {
            imagePrompt = `Impressionist oil painting of a vast calm ocean at golden hour, a single white dove in flight silhouetted against a sky painted in warm amber, soft coral, and pale lavender. Gentle waves reflecting the sunset light. Olive branches frame the foreground. Mood: serene, hopeful, quietly powerful. No text, no faces, no religious symbols, no violence.`;
          } else if (topic.includes('health') || topic.includes('healing')) {
            imagePrompt = `Soft watercolor illustration of morning sunlight streaming through sheer curtains onto a windowsill filled with wildflowers in bloom. A butterfly with translucent wings rests on a petal. Color palette: warm honey gold, soft sage green, gentle lavender. Bokeh light particles float in the air. Mood: tender, comforting, full of quiet hope. No text, no faces, no medical equipment, no religious symbols.`;
          } else if (topic.includes('family') || topic.includes('marriage')) {
            imagePrompt = `Warm gouache illustration of two ancient oak trees growing side by side with their roots visibly intertwined beneath the earth, their canopies touching and creating a natural archway. A warm golden sunset glows behind them. Small birds nest in the shared branches. Color palette: rich amber, deep forest green, warm sienna. Mood: enduring love, reconciliation, warmth. No text, no faces, no religious symbols.`;
          } else if (topic.includes('employment') || topic.includes('job')) {
            imagePrompt = `Digital art with painterly textures showing a single green seedling pushing through a crack in weathered concrete, bathed in a shaft of brilliant golden sunlight from above. Behind it, a path leads from shadow into warm light. Color palette: deep charcoal, vibrant green, golden yellow, warm amber. Mood: determination, breakthrough, triumph over adversity. No text, no faces, no office settings, no religious symbols.`;
          } else if (topic.includes('community')) {
            imagePrompt = `Warm watercolor painting of diverse hands reaching together over a shared table outdoors at golden hour, surrounded by abundant food and wildflowers. Trees with string lights frame the scene. Color palette: warm sunset orange, soft cream, earthy brown, sage green. Mood: togetherness, belonging, communal warmth. No text, no faces, no religious symbols.`;
          } else if (topic.includes('faith')) {
            imagePrompt = `Dramatic oil painting of a single candle flame burning brightly in deep darkness, its warm light radiating outward in concentric golden circles. The flame is reflected in a still pool of water below. Tiny sparks float upward like fireflies. Color palette: deep indigo, rich gold, warm amber, soft white. Mood: intimate, reverent, quietly powerful. No text, no faces, no religious symbols.`;
          } else if (topic.includes('education')) {
            imagePrompt = `Soft impressionist painting of an open leather-bound book on a weathered wooden desk beside a sunlit window. Morning light streams across the pages, casting warm shadows. A cup of tea steams gently beside a small potted plant. Color palette: warm honey, cream, soft brown, sage green. Mood: curiosity, new beginnings, peaceful learning. No text, no faces, no religious symbols.`;
          } else if (topic.includes('gratitude')) {
            imagePrompt = `Luminous impressionist painting of a breathtaking sunrise over a mirror-still mountain lake, wildflowers covering the foreground meadow. Birds take flight into a sky painted in rose gold and soft lavender. Morning mist rises from the water. Color palette: rose gold, soft peach, lavender, warm white. Mood: profound thankfulness, awe, joyful reverence. No text, no faces, no religious symbols.`;
          } else {
            imagePrompt = `Beautiful digital art with painterly textures of a winding forest path through tall ancient trees, dappled sunlight filtering through a canopy of green and gold leaves. The path leads toward a warm, glowing clearing in the distance. Wildflowers line the edges. Color palette: emerald green, warm gold, soft amber, earthy brown. Mood: contemplative, purposeful, gently hopeful. No text, no faces, no religious symbols.`;
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
