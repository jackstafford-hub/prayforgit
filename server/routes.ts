import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPrayerSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

      // Generate image using DALL-E
      const imagePrompt = `A peaceful, hopeful, and inspiring abstract image representing prayer and spiritual support for: ${title}. 
Style: Soft, warm lighting, gentle colors (blues, golds, whites), peaceful atmosphere. 
Avoid: Text, people's faces, specific religious symbols. 
Focus on: Light, nature, peace, hope, abstract spiritual elements like rays of light, calm water, or gentle landscapes.`;

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

  return httpServer;
}
