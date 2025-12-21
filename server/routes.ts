import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPrayerSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import express from "express";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve static assets from attached_assets/generated_images
  const assetsPath = path.resolve(process.cwd(), "attached_assets/generated_images");
  app.use("/assets", express.static(assetsPath));
  
  // Setup authentication
  await setupAuth(app);


  // Generate prayer content using OpenAI (text only - fast)
  app.post("/api/generate-prayer", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
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

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.`;

      const prayerPrompt = `Write a short, powerful prayer (2-3 sentences) for: ${title}

The prayer should:
- Be written in THIRD PERSON perspective (e.g., "protect them", "bless his family", "guide her through") because OTHER PEOPLE will be praying for this person, not the person themselves
- Be heartfelt and sincere
- Ask for divine intervention
- End with "Amen"
- Be suitable for people of Christian faith to recite together
- Use "we" instead of "I" since a community is praying together`;

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

      // Use AI to generate a contextual image prompt based on the prayer content
      const promptGenerationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Based on this prayer request, create a DALL-E image prompt for a powerful, emotional image that captures the essence of this issue.

Title: ${title}
${aiSummary ? `Content: ${aiSummary.substring(0, 500)}` : ''}

Create a detailed image prompt that:
1. Captures the specific emotional theme and subject matter of this prayer (e.g., if about Sudan, show African landscape; if about a sick mother, show healing imagery)
2. Uses symbolic and metaphorical imagery that relates directly to the content
3. Has warm, hopeful lighting with emotional impact
4. Is artistic and moving without being literal or graphic

IMPORTANT RULES:
- NO text, words, or letters in the image
- NO human faces or specific people
- NO religious symbols (crosses, etc.)
- Focus on nature, light, symbolic objects, and abstract emotional imagery

Respond with ONLY the image prompt, nothing else.`
        }],
        temperature: 0.7,
      });

      const imagePrompt = promptGenerationResponse.choices[0].message.content || 
        `Evocative image symbolizing hope and healing: golden sunlight breaking through clouds over a peaceful landscape. Style: warm, emotional, cinematic. Avoid: text, faces, religious symbols.`;

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1792x1024",
        quality: "standard",
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
  app.post("/api/prayers", async (req, res) => {
    try {
      const validatedData = insertPrayerSchema.parse(req.body);
      const prayer = await storage.createPrayer(validatedData);
      res.status(201).json(prayer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid prayer data", details: error.errors });
      }
      console.error("Error creating prayer:", error);
      res.status(500).json({ error: "Failed to create prayer" });
    }
  });

  // Increment prayer count
  app.post("/api/prayers/:id/pray", async (req, res) => {
    try {
      const prayer = await storage.incrementPrayerCount(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }
      res.json(prayer);
    } catch (error: any) {
      console.error("Error incrementing prayer count:", error);
      res.status(500).json({ error: "Failed to increment prayer count" });
    }
  });

  // Create donation checkout session
  app.post("/api/create-donation-session", async (req, res) => {
    try {
      const { prayerId, amount = 100 } = req.body;
      
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
              currency: 'eur',
              product_data: {
                name: 'Support PrayForChange',
                description: `Help spread the prayer: "${prayer.title}"`,
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
      res.status(500).json({ error: "Failed to create donation session" });
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

      if (prayer.authorId && prayer.authorId !== userId) {
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

      const prayer = await storage.getPrayerById(req.params.id);
      if (!prayer) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      if (prayer.authorId && prayer.authorId !== userId) {
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

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.`;

        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.8,
        });

        updates.aiSummary = summaryResponse.choices[0].message.content || "";
      }

      if (type === 'prayer' || type === 'both') {
        const prayerPrompt = `Write a short, powerful prayer (2-3 sentences) for: ${prayer.title}

The prayer should:
- Be written in THIRD PERSON perspective (e.g., "protect them", "bless his family", "guide her through") because OTHER PEOPLE will be praying for this person, not the person themselves
- Be heartfelt and sincere
- Ask for divine intervention
- End with "Amen"
- Be suitable for people of Christian faith to recite together
- Use "we" instead of "I" since a community is praying together`;

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
  app.post("/api/admin/regenerate-images", async (req, res) => {
    try {
      const allPrayers = await storage.getPrayers();
      const results = [];
      
      for (const prayer of allPrayers) {
        try {
          // Create topic-specific prompts for variety
          let imagePrompt: string;
          const topic = prayer.topic?.toLowerCase() || '';
          
          if (topic.includes('peace') || topic.includes('world')) {
            imagePrompt = `A hopeful image symbolizing world peace and unity: a beautiful dove flying over a calm ocean at sunrise, olive branches, or diverse hands joining together in silhouette. Style: peaceful, hopeful, golden morning light. Avoid: Any text, faces, violence, weapons, specific locations.`;
          } else if (topic.includes('health') || topic.includes('healing')) {
            imagePrompt = `An image symbolizing healing and hope: gentle sunlight streaming through a hospital window onto flowers, a butterfly emerging from a cocoon, or hands gently cradling a glowing light. Style: soft, warm, comforting. Avoid: Any text, faces, medical equipment.`;
          } else if (topic.includes('family') || topic.includes('marriage')) {
            imagePrompt = `An image symbolizing family reconciliation and love: two trees with intertwined roots, a broken bridge being mended by golden light, or two birds returning to the same nest. Style: warm, emotional, romantic lighting. Avoid: Any text, faces, specific people.`;
          } else if (topic.includes('employment') || topic.includes('job')) {
            imagePrompt = `An image symbolizing breakthrough and new opportunities: a door opening to brilliant light, seeds sprouting through concrete, or a path emerging through a dark forest into sunlight. Style: hopeful, triumphant, golden hour lighting. Avoid: Any text, faces, office settings.`;
          } else {
            imagePrompt = `Create a hopeful, peaceful image with warm golden lighting. Include nature elements like sunlight, flowers, or calm water. Style: evocative, emotional, beautiful. Avoid: Any text, faces, religious symbols.`;
          }

          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            size: "1792x1024",
            quality: "standard",
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

  return httpServer;
}
