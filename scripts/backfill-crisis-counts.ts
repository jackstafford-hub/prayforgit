import { pool, db } from "../server/db";
import { prayers, users } from "../shared/schema";
import { eq, or, sql } from "drizzle-orm";

const TARGET_EMAIL = "jackstaffmail@gmail.com";

async function run() {
  console.log(`[BACKFILL] Seeding prayer counts for ${TARGET_EMAIL}...`);

  // Find prayers linked via author_id → users.email
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, TARGET_EMAIL))
    .limit(1);

  // Gather prayer IDs from both possible linkage paths:
  // 1. author_id → users table (registered account)
  // 2. created_by_email (daily crisis pipeline uses this column)
  const byEmail = await db
    .select({ id: prayers.id, title: prayers.title, count: prayers.count })
    .from(prayers)
    .where(eq(prayers.createdByEmail, TARGET_EMAIL));

  const byAuthorId = user
    ? await db
        .select({ id: prayers.id, title: prayers.title, count: prayers.count })
        .from(prayers)
        .where(eq(prayers.authorId, user.id))
    : [];

  // Merge deduplicated by ID
  const seen = new Set<string>();
  const existing = [...byEmail, ...byAuthorId].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (!existing.length) {
    console.log(`[BACKFILL] No prayers found for ${TARGET_EMAIL} — nothing to backfill.`);
    await pool.end();
    return;
  }

  console.log(`[BACKFILL] Found ${existing.length} prayer(s) to seed.`);

  // Generate a pool of unique random integers between 2303 and 6505
  const MIN = 2303;
  const MAX = 6505;
  const range = MAX - MIN + 1;

  if (existing.length > range) {
    throw new Error(
      `Cannot assign unique counts: need ${existing.length} values but only ${range} available in [${MIN}, ${MAX}]`
    );
  }

  const usedCounts = new Set<number>();
  function uniqueRandom(): number {
    let n: number;
    do {
      n = Math.floor(Math.random() * range) + MIN;
    } while (usedCounts.has(n));
    usedCounts.add(n);
    return n;
  }

  let updated = 0;
  for (const p of existing) {
    const newCount = uniqueRandom();
    await db
      .update(prayers)
      .set({ count: newCount, goal: 10000 })
      .where(eq(prayers.id, p.id));
    console.log(`  ✓ "${p.title.slice(0, 60)}" → count=${newCount}, goal=10000`);
    updated++;
  }

  console.log(
    `[BACKFILL] Done. ${updated} prayer(s) updated with unique counts and goal=10000.`
  );
  await pool.end();
}

run().catch(async (err) => {
  console.error("[BACKFILL] Failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
