import { pool, db } from "../server/db";
import { prayers, users } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
  console.log("[BACKFILL] Seeding prayer counts for jackstaffmail@gmail.com...");

  // Find the crisis account user id
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, "jackstaffmail@gmail.com"))
    .limit(1);

  if (!user) {
    console.log("[BACKFILL] User jackstaffmail@gmail.com not found — nothing to backfill.");
    await pool.end();
    return;
  }

  console.log(`[BACKFILL] Found user id: ${user.id}`);

  // Find all their prayers
  const existing = await db
    .select({ id: prayers.id, title: prayers.title, count: prayers.count })
    .from(prayers)
    .where(eq(prayers.authorId, user.id));

  if (!existing.length) {
    console.log("[BACKFILL] No prayers found for this account — nothing to backfill.");
    await pool.end();
    return;
  }

  console.log(`[BACKFILL] Found ${existing.length} prayer(s) to seed.`);

  let updated = 0;
  for (const p of existing) {
    const newCount = Math.floor(Math.random() * (6505 - 2303 + 1)) + 2303;
    await db
      .update(prayers)
      .set({ count: newCount, goal: 10000 })
      .where(eq(prayers.id, p.id));
    console.log(`  ✓ "${p.title.slice(0, 60)}" → count=${newCount}, goal=10000`);
    updated++;
  }

  console.log(`[BACKFILL] Done. ${updated} prayer(s) updated.`);
  await pool.end();
}

run().catch(async (err) => {
  console.error("[BACKFILL] Failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
