import { db } from "./db";
import { type User, type UpsertUser, type Prayer, type InsertPrayer, users, prayers } from "@shared/schema";
import { eq, desc, gte } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
