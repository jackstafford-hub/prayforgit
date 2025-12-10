import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPrayerSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Generate prayer content using OpenAI
  app.post("/api/generate-prayer", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: "Title is required" });
      }

      // Generate AI summary using GPT
      const summaryPrompt = `You are writing a heartfelt prayer request story for a platform similar to Change.org but for prayers.

Title: ${title}
${description ? `Personal context: ${description}` : ''}

Write a compelling 3-4 paragraph story that:
1. Opens with the urgency and importance of this prayer need
2. ${description ? 'Incorporates the personal context provided' : 'Expands on why this prayer matters'}
3. Calls others to join in prayer
4. Inspires hope and unity

Write in first person. Be compassionate, authentic, and inspiring. Use a tone similar to Change.org petitions but focused on spiritual support.`;

      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        temperature: 0.8,
      });

      const aiSummary = summaryResponse.choices[0].message.content || "";

      // Generate recitable prayer
      const prayerPrompt = `Write a short, powerful prayer (2-3 sentences) for: ${title}

The prayer should:
- Be heartfelt and sincere
- Ask for divine intervention
- End with "Amen"
- Be suitable for people of Christian faith to recite together`;

      const prayerResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prayerPrompt }],
        temperature: 0.7,
      });

      const recitablePrayer = prayerResponse.choices[0].message.content || "";

      // Generate image using DALL-E based on the story content
      // Extract key themes from the AI summary to create varied imagery
      const summaryLower = aiSummary.toLowerCase();
      let imagePrompt: string;
      
      if (summaryLower.includes('cancer') || summaryLower.includes('illness') || summaryLower.includes('hospital') || summaryLower.includes('health') || summaryLower.includes('healing')) {
        imagePrompt = `An image symbolizing healing and hope: gentle sunlight streaming through a window onto fresh flowers, a butterfly emerging from a cocoon, or delicate light breaking through storm clouds. Style: soft, warm, comforting, ethereal. Avoid: Any text, faces, medical imagery.`;
      } else if (summaryLower.includes('marriage') || summaryLower.includes('family') || summaryLower.includes('children') || summaryLower.includes('relationship') || summaryLower.includes('reconciliation')) {
        imagePrompt = `An image symbolizing family love and restoration: two trees with intertwined branches, a broken heart being mended with golden light, or two birds building a nest together. Style: warm, emotional, romantic sunset lighting. Avoid: Any text, faces, specific people.`;
      } else if (summaryLower.includes('job') || summaryLower.includes('employment') || summaryLower.includes('work') || summaryLower.includes('career') || summaryLower.includes('interview')) {
        imagePrompt = `An image symbolizing breakthrough and new opportunities: a grand door opening to brilliant golden light, seeds sprouting through cracked concrete, or a winding path through a forest leading to a sunlit clearing. Style: hopeful, triumphant, inspiring. Avoid: Any text, faces, office imagery.`;
      } else if (summaryLower.includes('peace') || summaryLower.includes('war') || summaryLower.includes('conflict') || summaryLower.includes('violence')) {
        imagePrompt = `A hopeful image symbolizing peace and unity: a beautiful white dove carrying an olive branch over calm waters at sunrise, or hands of different shades clasped together in silhouette against a golden sky. Style: peaceful, hopeful, dawn lighting. Avoid: Any text, specific faces, violence.`;
      } else if (summaryLower.includes('grief') || summaryLower.includes('loss') || summaryLower.includes('death') || summaryLower.includes('passed away')) {
        imagePrompt = `An image symbolizing comfort and eternal hope: a single candle flame in soft darkness, a butterfly landing on a memorial flower, or sunlight breaking through clouds to illuminate a peaceful meadow. Style: serene, comforting, gentle. Avoid: Any text, faces, graves.`;
      } else {
        imagePrompt = `Create a unique, emotionally moving image with warm hopeful lighting. Visual elements: nature scenes, rays of light, calm water, or symbolic imagery of hope and transformation. Style: evocative, beautiful, peaceful. Avoid: Any text, faces, religious symbols.`;
      }

      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1792x1024",
        quality: "standard",
        n: 1,
      });

      const imageUrl = imageResponse.data?.[0]?.url || "";

      res.json({
        aiSummary,
        recitablePrayer,
        imageUrl,
      });
    } catch (error: any) {
      console.error("Error generating prayer:", error);
      res.status(500).json({ 
        error: "Failed to generate prayer content",
        details: error.message 
      });
    }
  });

  // Get all prayers
  app.get("/api/prayers", async (_req, res) => {
    try {
      const allPrayers = await storage.getPrayers();
      res.json(allPrayers);
    } catch (error: any) {
      console.error("Error fetching prayers:", error);
      res.status(500).json({ error: "Failed to fetch prayers" });
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
