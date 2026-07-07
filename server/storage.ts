import { db, generateSlugFromTitle } from "./db";
import { type User, type UpsertUser, type Prayer, type InsertPrayer, type Report, type InsertReport, type PrayerUpdate, type InsertPrayerUpdate, type Subscriber, type CrisisPrayerSend, type DailyPrayerRun, type InsertDailyPrayerRun, users, prayers, reports, dailyPrayerCounts, prayerUpdates, subscribers, crisisPrayerSends, dailyPrayerRuns } from "@shared/schema";
import { eq, desc, gte, and, sql, count as countFn, lte, ne } from "drizzle-orm";

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
  getPrayerBySlug(slug: string): Promise<Prayer | undefined>;
  getPrayerBySlugOrId(slugOrId: string): Promise<Prayer | undefined>;
  createPrayer(prayer: InsertPrayer): Promise<Prayer>;
  createPrayerWithId(prayer: InsertPrayer & { id: string; slug: string; approvalStatus: string; createdAt: Date }): Promise<Prayer>;
  incrementPrayerCount(id: string): Promise<Prayer | undefined>;
  updatePrayerImage(id: string, imageUrl: string): Promise<Prayer | undefined>;
  updatePrayerContent(id: string, content: { aiSummary?: string; recitablePrayer?: string }): Promise<Prayer | undefined>;
  updatePrayerTitle(id: string, title: string): Promise<Prayer | undefined>;
  updatePrayerGoal(id: string, goal: number): Promise<Prayer | undefined>;
  updatePrayerAuthorByUser(authorId: string, authorName: string): Promise<void>;
  
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

  // Subscriber methods
  addSubscriber(email: string, token: string): Promise<'created' | 'reactivated' | 'already_active'>;
  getSubscriberByToken(token: string): Promise<Subscriber | undefined>;
  deactivateSubscriberByToken(token: string): Promise<boolean>;
  getActiveSubscribers(): Promise<Subscriber[]>;

  // Crisis prayer send methods
  logCrisisPrayerSend(prayerId: string, subscriberCount: number): Promise<void>;
  getCrisisPrayerSendToday(): Promise<CrisisPrayerSend | null>;

  // Approval flow methods
  getPrayerByApprovalToken(token: string): Promise<Prayer | undefined>;
  setPrayerPendingApproval(id: string, token: string, expiry: Date): Promise<Prayer>;
  setPrayerApprovalStatus(id: string, status: 'published' | 'rejected'): Promise<void>;

  // Autonomous daily prayer pipeline methods
  logDailyPrayerRun(data: Omit<InsertDailyPrayerRun, 'id'>): Promise<DailyPrayerRun>;
  updateDailyPrayerRun(id: string, data: Partial<InsertDailyPrayerRun>): Promise<void>;
  getRecentDailyCrisisPrayers(days: number): Promise<string[]>;
  getPublishedDailyCrisisPrayers(limit: number): Promise<Prayer[]>;
  getDailyPrayerRunByDraftId(draftId: string): Promise<DailyPrayerRun | undefined>;

  // Related prayers
  getRelatedPrayers(prayerId: string, topic: string, limit: number): Promise<Prayer[]>;
  getLatestCrisisPrayer(): Promise<Prayer | undefined>;

  // Pipeline health
  getLatestDailyPrayerRun(): Promise<DailyPrayerRun | undefined>;
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
    const conditions = [gte(prayers.count, 5), eq(prayers.flaggedForReview, false), eq(prayers.approvalStatus, 'published')];

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

    // Crisis prayers always float to the top; then sort by prayer count
    return await db.select().from(prayers).where(and(...conditions))
      .orderBy(desc(prayers.isDailyCrisisPrayer), desc(prayers.count));
  }

  async getPrayersByAuthor(authorId: string): Promise<Prayer[]> {
    return await db.select().from(prayers).where(eq(prayers.authorId, authorId)).orderBy(desc(prayers.createdAt));
  }

  async getPrayerById(id: string): Promise<Prayer | undefined> {
    const [prayer] = await db.select().from(prayers).where(eq(prayers.id, id));
    return prayer;
  }

  async getPrayerBySlug(slug: string): Promise<Prayer | undefined> {
    const [prayer] = await db.select().from(prayers).where(eq(prayers.slug, slug));
    return prayer;
  }

  async getPrayerBySlugOrId(slugOrId: string): Promise<Prayer | undefined> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (UUID_REGEX.test(slugOrId)) {
      return this.getPrayerById(slugOrId);
    }
    return this.getPrayerBySlug(slugOrId);
  }

  async generateUniqueSlug(title: string): Promise<string> {
    const base = generateSlugFromTitle(title);
    const [existing] = await db.select({ slug: prayers.slug }).from(prayers).where(eq(prayers.slug, base));
    if (!existing) return base;
    let counter = 2;
    while (true) {
      const candidate = `${base}-${counter}`;
      const [taken] = await db.select({ slug: prayers.slug }).from(prayers).where(eq(prayers.slug, candidate));
      if (!taken) return candidate;
      counter++;
    }
  }

  async createPrayer(insertPrayer: InsertPrayer): Promise<Prayer> {
    const slug = await this.generateUniqueSlug(insertPrayer.title);
    const [prayer] = await db.insert(prayers).values({ ...insertPrayer, slug }).returning();
    return prayer;
  }

  async createPrayerWithId(insertPrayer: InsertPrayer & { id: string; slug: string; approvalStatus: string; createdAt: Date }): Promise<Prayer> {
    const [prayer] = await db.insert(prayers).values(insertPrayer as any).returning();
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

  async updatePrayerAuthorByUser(authorId: string, authorName: string): Promise<void> {
    await db
      .update(prayers)
      .set({ author: authorName })
      .where(eq(prayers.authorId, authorId));
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

  // Subscriber methods
  async addSubscriber(email: string, token: string): Promise<'created' | 'reactivated' | 'already_active'> {
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    if (!existing) {
      await db.insert(subscribers).values({ email, unsubscribeToken: token, isActive: true });
      return 'created';
    }
    if (existing.isActive) {
      return 'already_active';
    }
    await db.update(subscribers)
      .set({ isActive: true, subscribedAt: new Date() })
      .where(eq(subscribers.id, existing.id));
    return 'reactivated';
  }

  async getSubscriberByToken(token: string): Promise<Subscriber | undefined> {
    const [row] = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    return row;
  }

  async deactivateSubscriberByToken(token: string): Promise<boolean> {
    const result = await db.update(subscribers)
      .set({ isActive: false })
      .where(and(eq(subscribers.unsubscribeToken, token), eq(subscribers.isActive, true)));
    return (result.rowCount ?? 0) > 0;
  }

  async getActiveSubscribers(): Promise<Subscriber[]> {
    return await db.select().from(subscribers).where(eq(subscribers.isActive, true));
  }

  async logCrisisPrayerSend(prayerId: string, subscriberCount: number): Promise<void> {
    await db.insert(crisisPrayerSends).values({ prayerId, subscriberCount });
  }

  async getCrisisPrayerSendToday(): Promise<CrisisPrayerSend | null> {
    const todayStart = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');
    const [row] = await db
      .select()
      .from(crisisPrayerSends)
      .where(gte(crisisPrayerSends.sentAt, todayStart))
      .orderBy(desc(crisisPrayerSends.sentAt))
      .limit(1);
    return row ?? null;
  }

  async getPrayerByApprovalToken(token: string): Promise<Prayer | undefined> {
    const [prayer] = await db.select().from(prayers).where(eq(prayers.approvalToken, token));
    return prayer;
  }

  async setPrayerPendingApproval(id: string, token: string, expiry: Date): Promise<Prayer> {
    const [prayer] = await db
      .update(prayers)
      .set({ approvalStatus: 'pending_approval', approvalToken: token, approvalTokenExpiry: expiry })
      .where(eq(prayers.id, id))
      .returning();
    return prayer;
  }

  async setPrayerApprovalStatus(id: string, status: 'published' | 'rejected'): Promise<void> {
    await db
      .update(prayers)
      .set({ approvalStatus: status, approvalToken: null, approvalTokenExpiry: null })
      .where(eq(prayers.id, id));
  }

  async logDailyPrayerRun(data: Omit<InsertDailyPrayerRun, 'id'>): Promise<DailyPrayerRun> {
    const [row] = await db.insert(dailyPrayerRuns).values(data).returning();
    return row;
  }

  async updateDailyPrayerRun(id: string, data: Partial<InsertDailyPrayerRun>): Promise<void> {
    await db.update(dailyPrayerRuns).set(data).where(eq(dailyPrayerRuns.id, id));
  }

  async getRecentDailyCrisisPrayers(days: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ crisisChosen: dailyPrayerRuns.crisisChosen })
      .from(dailyPrayerRuns)
      .where(and(gte(dailyPrayerRuns.runAt, cutoff), sql`${dailyPrayerRuns.crisisChosen} IS NOT NULL`));
    return rows.map(r => r.crisisChosen as string);
  }

  async getPublishedDailyCrisisPrayers(limit: number): Promise<Prayer[]> {
    return db
      .select()
      .from(prayers)
      .where(and(eq(prayers.isDailyCrisisPrayer, true), eq(prayers.approvalStatus, 'published')))
      .orderBy(desc(prayers.createdAt))
      .limit(limit);
  }

  async getDailyPrayerRunByDraftId(draftId: string): Promise<DailyPrayerRun | undefined> {
    const [row] = await db
      .select()
      .from(dailyPrayerRuns)
      .where(eq(dailyPrayerRuns.draftId, draftId))
      .limit(1);
    return row;
  }

  async getRelatedPrayers(prayerId: string, topic: string, limit: number): Promise<Prayer[]> {
    return await db
      .select()
      .from(prayers)
      .where(and(
        eq(prayers.topic, topic),
        eq(prayers.approvalStatus, 'published'),
        eq(prayers.flaggedForReview, false),
        gte(prayers.count, 5),
        ne(prayers.id, prayerId),
      ))
      .orderBy(desc(prayers.count))
      .limit(limit);
  }

  async getLatestCrisisPrayer(): Promise<Prayer | undefined> {
    const [prayer] = await db
      .select()
      .from(prayers)
      .where(and(eq(prayers.isDailyCrisisPrayer, true), eq(prayers.approvalStatus, 'published')))
      .orderBy(desc(prayers.createdAt))
      .limit(1);
    return prayer;
  }

  async getLatestDailyPrayerRun(): Promise<DailyPrayerRun | undefined> {
    const [row] = await db
      .select()
      .from(dailyPrayerRuns)
      .orderBy(desc(dailyPrayerRuns.runAt))
      .limit(1);
    return row;
  }
}

export const storage = new DatabaseStorage();
