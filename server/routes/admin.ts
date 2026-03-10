import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, prayers } from "@shared/schema";
import { eq, ilike, sql, count, or, desc } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

function getAdminEmails(): string[] {
  const envValue = process.env.ADMIN_EMAILS || "";
  return envValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user || !user.email) {
      return res.status(401).json({ message: "User not found" });
    }

    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(user.email.toLowerCase())) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const rawPageSize = parseInt(req.query.pageSize as string) || 50;
    const pageSize = Math.min(Math.max(1, rawPageSize), 200);
    const searchQuery = (req.query.q as string) || "";

    const offset = (page - 1) * pageSize;

    let whereClause = undefined;
    if (searchQuery) {
      whereClause = ilike(users.email, `%${searchQuery}%`);
    }

    const [usersResult, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(users.createdAt),
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    res.json({
      users: usersResult,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/prayers", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const rawPageSize = parseInt(req.query.pageSize as string) || 25;
    const pageSize = Math.min(Math.max(1, rawPageSize), 200);
    const searchQuery = (req.query.q as string) || "";

    const offset = (page - 1) * pageSize;

    let whereClause = undefined;
    if (searchQuery) {
      whereClause = or(
        ilike(prayers.title, `%${searchQuery}%`),
        ilike(prayers.author, `%${searchQuery}%`),
        ilike(prayers.topic, `%${searchQuery}%`)
      );
    }

    const [prayersResult, totalResult] = await Promise.all([
      db
        .select({
          id: prayers.id,
          title: prayers.title,
          author: prayers.author,
          authorId: prayers.authorId,
          topic: prayers.topic,
          count: prayers.count,
          goal: prayers.goal,
          flaggedForReview: prayers.flaggedForReview,
          createdAt: prayers.createdAt,
          authorEmail: users.email,
        })
        .from(prayers)
        .leftJoin(users, eq(prayers.authorId, users.id))
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(desc(prayers.createdAt)),
      db
        .select({ count: count() })
        .from(prayers)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    res.json({
      prayers: prayersResult,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching prayers:", error);
    res.status(500).json({ message: "Failed to fetch prayers" });
  }
});

router.get("/check", requireAdmin, async (_req: Request, res: Response) => {
  res.json({ isAdmin: true });
});

router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.get("/flagged-prayers", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const flaggedPrayers = await storage.getFlaggedPrayers();
    res.json(flaggedPrayers);
  } catch (error) {
    console.error("Error fetching flagged prayers:", error);
    res.status(500).json({ message: "Failed to fetch flagged prayers" });
  }
});

router.post("/prayers/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const prayer = await storage.approvePrayer(req.params.id);
    if (!prayer) {
      return res.status(404).json({ message: "Prayer not found" });
    }
    res.json(prayer);
  } catch (error) {
    console.error("Error approving prayer:", error);
    res.status(500).json({ message: "Failed to approve prayer" });
  }
});

router.delete("/prayers/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await storage.deletePrayer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting prayer:", error);
    res.status(500).json({ message: "Failed to delete prayer" });
  }
});

router.get("/reports", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const reportsData = await storage.getReportsWithPrayers();
    res.json(reportsData);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

router.delete("/reports/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await storage.deleteReport(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

export default router;
