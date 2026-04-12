import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"),
  password: text("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailOptIn: boolean("email_opt_in").default(false),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prayers = pgTable("prayers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  author: text("author").notNull().default('Anonymous'),
  authorId: varchar("author_id").references(() => users.id),
  aiSummary: text("ai_summary"),
  recitablePrayer: text("recitable_prayer"),
  imageUrl: text("image_url"),
  count: integer("count").notNull().default(1),
  goal: integer("goal").notNull().default(100),
  topic: text("topic").notNull().default('General'),
  flaggedForReview: boolean("flagged_for_review").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const PRAYER_CATEGORIES = [
  "Health",
  "Family",
  "Employment",
  "World Peace",
  "Community",
  "Faith",
  "Education",
  "Gratitude",
  "General",
] as const;

export type PrayerCategory = typeof PRAYER_CATEGORIES[number];

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertPrayerSchema = createInsertSchema(prayers).omit({
  id: true,
  createdAt: true,
  slug: true,
});

export type InsertPrayer = z.infer<typeof insertPrayerSchema>;
export type Prayer = typeof prayers.$inferSelect;

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  emailOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

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

export const prayerUpdates = pgTable("prayer_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prayerId: varchar("prayer_id").references(() => prayers.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrayerUpdateSchema = createInsertSchema(prayerUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertPrayerUpdate = z.infer<typeof insertPrayerUpdateSchema>;
export type PrayerUpdate = typeof prayerUpdates.$inferSelect;

export const dailyPrayerCounts = pgTable("daily_prayer_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prayerId: varchar("prayer_id").references(() => prayers.id).notNull(),
  date: varchar("date").notNull(),
  count: integer("count").notNull().default(0),
});

export type DailyPrayerCount = typeof dailyPrayerCounts.$inferSelect;
