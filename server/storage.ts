import { db } from "./db";
import { type User, type UpsertUser, type Prayer, type InsertPrayer, type Report, type InsertReport, users, prayers, reports, dailyPrayerCounts } from "@shared/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Prayer methods
  getPrayers(): Promise<Prayer[]>;
  getPublicPrayers(): Promise<Prayer[]>;
  getPrayersByAuthor(authorId: string): Promise<Prayer[]>;
  getPrayerById(id: string): Promise<Prayer | undefined>;
  createPrayer(prayer: InsertPrayer): Promise<Prayer>;
  incrementPrayerCount(id: string): Promise<Prayer | undefined>;
  updatePrayerImage(id: string, imageUrl: string): Promise<Prayer | undefined>;
  updatePrayerContent(id: string, content: { aiSummary?: string; recitablePrayer?: string }): Promise<Prayer | undefined>;
  
  // Report methods
  createReport(report: InsertReport): Promise<Report>;
  
  // Daily prayer count methods
  incrementDailyPrayerCount(prayerId: string): Promise<void>;
  getDailyPrayerCountsForDate(date: string): Promise<{ prayerId: string; count: number }[]>;
  resetDailyPrayerCounts(date: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Prayer methods
  async getPrayers(): Promise<Prayer[]> {
    return await db.select().from(prayers).orderBy(desc(prayers.count));
  }

  async getPublicPrayers(): Promise<Prayer[]> {
    return await db.select().from(prayers).where(gte(prayers.count, 5)).orderBy(desc(prayers.count));
  }

  async getPrayersByAuthor(authorId: string): Promise<Prayer[]> {
    return await db.select().from(prayers).where(eq(prayers.authorId, authorId)).orderBy(desc(prayers.createdAt));
  }

  async getPrayerById(id: string): Promise<Prayer | undefined> {
    const [prayer] = await db.select().from(prayers).where(eq(prayers.id, id));
    return prayer;
  }

  async createPrayer(insertPrayer: InsertPrayer): Promise<Prayer> {
    const [prayer] = await db.insert(prayers).values(insertPrayer).returning();
    return prayer;
  }

  async incrementPrayerCount(id: string): Promise<Prayer | undefined> {
    const prayer = await this.getPrayerById(id);
    if (!prayer) return undefined;

    const newCount = prayer.count + 1;
    let newGoal = prayer.goal;
    
    if (newCount >= prayer.goal) {
      newGoal = prayer.goal * 2;
    }

    const [updated] = await db
      .update(prayers)
      .set({ count: newCount, goal: newGoal })
      .where(eq(prayers.id, id))
      .returning();
    
    return updated;
  }

  async updatePrayerImage(id: string, imageUrl: string): Promise<Prayer | undefined> {
    const [updated] = await db
      .update(prayers)
      .set({ imageUrl })
      .where(eq(prayers.id, id))
      .returning();
    
    return updated;
  }

  async updatePrayerContent(id: string, content: { aiSummary?: string; recitablePrayer?: string }): Promise<Prayer | undefined> {
    const updateData: Partial<Prayer> = {};
    if (content.aiSummary !== undefined) updateData.aiSummary = content.aiSummary;
    if (content.recitablePrayer !== undefined) updateData.recitablePrayer = content.recitablePrayer;
    
    const [updated] = await db
      .update(prayers)
      .set(updateData)
      .where(eq(prayers.id, id))
      .returning();
    
    return updated;
  }

  // Report methods
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  // Daily prayer count methods
  async incrementDailyPrayerCount(prayerId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await db.select().from(dailyPrayerCounts)
      .where(and(eq(dailyPrayerCounts.prayerId, prayerId), eq(dailyPrayerCounts.date, today)));
    
    if (existing.length > 0) {
      await db.update(dailyPrayerCounts)
        .set({ count: existing[0].count + 1 })
        .where(eq(dailyPrayerCounts.id, existing[0].id));
    } else {
      await db.insert(dailyPrayerCounts).values({ prayerId, date: today, count: 1 });
    }
  }

  async getDailyPrayerCountsForDate(date: string): Promise<{ prayerId: string; count: number }[]> {
    const results = await db.select({
      prayerId: dailyPrayerCounts.prayerId,
      count: dailyPrayerCounts.count,
    }).from(dailyPrayerCounts).where(eq(dailyPrayerCounts.date, date));
    return results;
  }

  async resetDailyPrayerCounts(date: string): Promise<void> {
    await db.delete(dailyPrayerCounts).where(eq(dailyPrayerCounts.date, date));
  }
}

export const storage = new DatabaseStorage();
