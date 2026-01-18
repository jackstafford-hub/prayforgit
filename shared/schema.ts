import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (required for Replit Auth)
export * from "./models/auth";
import { users } from "./models/auth";

export const prayers = pgTable("prayers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  author: text("author").notNull().default('Anonymous'),
  authorId: varchar("author_id").references(() => users.id),
  aiSummary: text("ai_summary"),
  recitablePrayer: text("recitable_prayer"),
  imageUrl: text("image_url"),
  count: integer("count").notNull().default(1),
  goal: integer("goal").notNull().default(100),
  topic: text("topic").notNull().default('General'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrayerSchema = createInsertSchema(prayers).omit({
  id: true,
  createdAt: true,
});

export type InsertPrayer = z.infer<typeof insertPrayerSchema>;
export type Prayer = typeof prayers.$inferSelect;

// Reports table for policy violations
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prayerId: varchar("prayer_id").references(() => prayers.id).notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  reporterEmail: varchar("reporter_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
