import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, prayers } from "@shared/schema";
import { eq, ilike, sql, count, or, desc } from "drizzle-orm";
import { storage } from "../storage";
import { sendPipelineOverdueAlertEmail } from "../emailService";

const PIPELINE_OVERDUE_THRESHOLD_MS = 26 * 60 * 60 * 1000;
const ALERT_THROTTLE_MS = 24 * 60 * 60 * 1000;
const ALERT_SETTING_KEY = "last_pipeline_overdue_alert_sent_at";

let lastOverdueAlertSentAt: number | null = null;
let alertThrottleInitialized = false;

async function initAlertThrottleFromDb(): Promise<void> {
  if (alertThrottleInitialized) return;
  alertThrottleInitialized = true;
  try {
    const stored = await storage.getAppSetting(ALERT_SETTING_KEY);
    if (stored) {
      const ms = parseInt(stored, 10);
      if (!isNaN(ms)) lastOverdueAlertSentAt = ms;
    }
  } catch (err: any) {
    console.error("[PIPELINE-STATUS] Could not load alert throttle from DB:", err?.message || err);
  }
}

const router = Router();

function getAdminEmails(): string[] {
  const envValue = process.env.ADMIN_EMAILS || "";
  return envValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
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

router.get("/debug-my-prayers", requireAdmin, async (req: Request, res: Response) => {
  const out: any = { steps: [] };
  try {
    const userId = req.session.userId!;
    out.userId = userId;
    out.steps.push("querying");
    const t0 = Date.now();
    const { storage } = await import("../storage");
    const rows = await storage.getPrayersByAuthor(userId);
    out.steps.push("queried in " + (Date.now() - t0) + "ms");
    out.count = rows.length;
    const t1 = Date.now();
    const json = JSON.stringify(rows);
    out.steps.push("stringified " + json.length + " bytes in " + (Date.now() - t1) + "ms");
    res.json(out);
  } catch (e: any) {
    out.error = e?.message || String(e);
    out.stack = (e?.stack || "").split("\n").slice(0, 8);
    res.status(200).json(out);
  }
});

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

router.get("/pipeline-status", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const run = await storage.getLatestDailyPrayerRun();
    res.json(run ?? null);

    await initAlertThrottleFromDb();

    const now = Date.now();
    const lastRunAt: Date | null = run?.runAt ? new Date(run.runAt) : null;
    const isOverdue =
      !lastRunAt || now - lastRunAt.getTime() > PIPELINE_OVERDUE_THRESHOLD_MS;

    if (!isOverdue) return;

    const alertThrottled =
      lastOverdueAlertSentAt !== null &&
      now - lastOverdueAlertSentAt < ALERT_THROTTLE_MS;

    if (alertThrottled) {
      console.log('[PIPELINE-STATUS] Pipeline overdue but alert throttled (sent within last 24h)');
      return;
    }

    // Optimistic in-memory lock — blocks concurrent requests from also sending
    lastOverdueAlertSentAt = now;

    const adminEmails = getAdminEmails();
    const siteUrl = process.env.SITE_URL || 'https://prayforchange.org';
    const dashboardUrl = `${siteUrl}/admin`;

    sendPipelineOverdueAlertEmail(adminEmails, lastRunAt, dashboardUrl).then(async (sent) => {
      if (sent) {
        // Persist to DB so the throttle survives restarts
        try {
          await storage.setAppSetting(ALERT_SETTING_KEY, String(now));
        } catch (err: any) {
          console.error('[PIPELINE-STATUS] Could not persist alert timestamp to DB:', err?.message || err);
        }
      } else {
        // Roll back the optimistic lock so a retry can happen next time
        if (lastOverdueAlertSentAt === now) lastOverdueAlertSentAt = null;
      }
    });
  } catch (error) {
    console.error("Error fetching pipeline status:", error);
    res.status(500).json({ message: "Failed to fetch pipeline status" });
  }
});

export default router;
