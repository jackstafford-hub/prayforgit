import { db } from "./db";
import { type User, type UpsertUser, type Prayer, type InsertPrayer, type Report, type InsertReport, type PrayerUpdate, type InsertPrayerUpdate, users, prayers, reports, dailyPrayerCounts, prayerUpdates } from "@shared/schema";
import { eq, desc, gte, and, sql, count as countFn } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  updateUser(id: string, data: { firstName?: string; lastName?: string; email?: string; emailOptIn?: boolean }): Promise<User | undefined>;
  
  // Prayer methods
  getPrayers(): Promise<Prayer[]>;
  getPublicPrayers(options?: { q?: string; topic?: string }): Promise<Prayer[]>;
  getPrayersByAuthor(authorId: string): Promise<Prayer[]>;
  getPrayerById(id: string): Promise<Prayer | undefined>;
  createPrayer(prayer: InsertPrayer): Promise<Prayer>;
  incrementPrayerCount(id: string): Promise<Prayer | undefined>;
  updatePrayerImage(id: string, imageUrl: string): Promise<Prayer | undefined>;
  updatePrayerContent(id: string, content: { aiSummary?: string; recitablePrayer?: string }): Promise<Prayer | undefined>;
  updatePrayerTitle(id: string, title: string): Promise<Prayer | undefined>;
  updatePrayerGoal(id: string, goal: number): Promise<Prayer | undefined>;
  
  // Report methods
  createReport(report: InsertReport): Promise<Report>;
  getReportsWithPrayers(): Promise<(Report & { prayerTitle: string })[]>;
  deleteReport(id: string): Promise<void>;
  
  // Admin methods
  getFlaggedPrayers(): Promise<Prayer[]>;
  approvePrayer(id: string): Promise<Prayer | undefined>;
  deletePrayer(id: string): Promise<void>;
  getAdminStats(): Promise<{ totalPrayers: number; flaggedPrayers: number; totalReports: number }>;
  
  // Prayer update methods
  getUpdatesByPrayerId(prayerId: string): Promise<PrayerUpdate[]>;
  createPrayerUpdate(update: InsertPrayerUpdate): Promise<PrayerUpdate>;

  // Password reset methods
  setResetToken(email: string, token: string, expiry: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: string, hashedPassword: string): Promise<void>;
  
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

  async updateUser(id: string, data: { firstName?: string; lastName?: string; email?: string; emailOptIn?: boolean }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Prayer methods
  async getPrayers(): Promise<Prayer[]> {
    return await db.select().from(prayers).orderBy(desc(prayers.count));
  }

  async getPublicPrayers(options?: { q?: string; topic?: string }): Promise<Prayer[]> {
    const conditions = [gte(prayers.count, 5), eq(prayers.flaggedForReview, false)];

    if (options?.q) {
      conditions.push(
        sql`to_tsvector('english',
          COALESCE(${prayers.title}, '') || ' ' ||
          COALESCE(${prayers.aiSummary}, '') || ' ' ||
          COALESCE(${prayers.author}, '')
        ) @@ plainto_tsquery('english', ${options.q})`
      );
    }

    if (options?.topic && options.topic !== "All") {
      conditions.push(eq(prayers.topic, options.topic));
    }

    return await db.select().from(prayers).where(and(...conditions)).orderBy(desc(prayers.count));
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

  async updatePrayerTitle(id: string, title: string): Promise<Prayer | undefined> {
    const [updated] = await db
      .update(prayers)
      .set({ title })
      .where(eq(prayers.id, id))
      .returning();
    
    return updated;
  }

  async updatePrayerGoal(id: string, goal: number): Promise<Prayer | undefined> {
    const [updated] = await db
      .update(prayers)
      .set({ goal })
      .where(eq(prayers.id, id))
      .returning();
    
    return updated;
  }

  // Report methods
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  // Report query methods
  async getReportsWithPrayers(): Promise<(Report & { prayerTitle: string })[]> {
    const results = await db
      .select({
        id: reports.id,
        prayerId: reports.prayerId,
        reason: reports.reason,
        details: reports.details,
        reporterEmail: reports.reporterEmail,
        createdAt: reports.createdAt,
        prayerTitle: prayers.title,
      })
      .from(reports)
      .innerJoin(prayers, eq(reports.prayerId, prayers.id))
      .orderBy(desc(reports.createdAt));
    return results;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  // Admin methods
  async getFlaggedPrayers(): Promise<Prayer[]> {
    return await db.select().from(prayers).where(eq(prayers.flaggedForReview, true)).orderBy(desc(prayers.createdAt));
  }

  async approvePrayer(id: string): Promise<Prayer | undefined> {
    const [updated] = await db
      .update(prayers)
      .set({ flaggedForReview: false })
      .where(eq(prayers.id, id))
      .returning();
    return updated;
  }

  async deletePrayer(id: string): Promise<void> {
    await db.delete(prayerUpdates).where(eq(prayerUpdates.prayerId, id));
    await db.delete(reports).where(eq(reports.prayerId, id));
    await db.delete(dailyPrayerCounts).where(eq(dailyPrayerCounts.prayerId, id));
    await db.delete(prayers).where(eq(prayers.id, id));
  }

  async getAdminStats(): Promise<{ totalPrayers: number; flaggedPrayers: number; totalReports: number }> {
    const [prayerStats] = await db.select({ total: countFn() }).from(prayers);
    const [flaggedStats] = await db.select({ total: countFn() }).from(prayers).where(eq(prayers.flaggedForReview, true));
    const [reportStats] = await db.select({ total: countFn() }).from(reports);
    return {
      totalPrayers: Number(prayerStats?.total || 0),
      flaggedPrayers: Number(flaggedStats?.total || 0),
      totalReports: Number(reportStats?.total || 0),
    };
  }

  // Prayer update methods
  async getUpdatesByPrayerId(prayerId: string): Promise<PrayerUpdate[]> {
    return await db.select().from(prayerUpdates).where(eq(prayerUpdates.prayerId, prayerId)).orderBy(desc(prayerUpdates.createdAt));
  }

  async createPrayerUpdate(update: InsertPrayerUpdate): Promise<PrayerUpdate> {
    const [created] = await db.insert(prayerUpdates).values(update).returning();
    return created;
  }

  // Password reset methods
  async setResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.email, email))
      .returning();
    return result.length > 0;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.resetToken, token), gte(users.resetTokenExpiry, new Date())));
    return user;
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, userId));
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
