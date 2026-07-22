import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, ilike, sql, count } from "drizzle-orm";

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

export default router;
