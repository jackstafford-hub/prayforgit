import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

const isProduction = process.env.NODE_ENV === "production";

function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    console.error("[DB] DATABASE_URL missing");
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return process.env.DATABASE_URL;
}

export const databaseUrl = getDatabaseUrl();

// Log DB hostname (safe, no creds) - always in production
if (databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    const dbHost = parsedUrl.hostname;
    const isPooler = dbHost.includes("-pooler");
    console.log(`[DB] DB host: ${dbHost} (pooler: ${isPooler})`);
  } catch {
    console.log("[DB] Could not parse DATABASE_URL for hostname");
  }
}

// Shared pool with Neon-compatible settings
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

// Non-blocking DB connectivity check using shared pool
export async function checkDbConnectivity(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1");
    console.log("[DB] DB connected successfully");
    return true;
  } catch (error: any) {
    const code = error?.code || error?.message || "UNKNOWN";
    console.error(`[DB] DB connectivity check failed: ${code}`);
    return false;
  }
}

export function generateSlugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || 'prayer';
}

export async function backfillPrayerSlugs(): Promise<void> {
  console.log("[DB] Starting prayer slug backfill...");
  try {
    const toFill = await pool.query<{ id: string; title: string }>(
      "SELECT id, title FROM prayers WHERE slug IS NULL ORDER BY created_at ASC"
    );

    if (toFill.rows.length === 0) {
      console.log("[DB] All prayers already have slugs, skipping backfill");
      return;
    }

    console.log(`[DB] Backfilling slugs for ${toFill.rows.length} prayers`);

    const existing = await pool.query<{ slug: string }>(
      "SELECT slug FROM prayers WHERE slug IS NOT NULL"
    );
    const existingSlugs = new Set(existing.rows.map((r) => r.slug));

    for (const row of toFill.rows) {
      const base = generateSlugFromTitle(row.title);
      let slug = base;
      let counter = 2;
      while (existingSlugs.has(slug)) {
        slug = `${base}-${counter}`;
        counter++;
      }
      existingSlugs.add(slug);
      await pool.query("UPDATE prayers SET slug = $1 WHERE id = $2", [slug, row.id]);
    }

    console.log(`[DB] Slug backfill complete: ${toFill.rows.length} prayers updated`);
  } catch (error: any) {
    console.error("[DB] Slug backfill failed:", error?.message || error);
  }
}

// Ensure all required tables exist in production with correct schema
// This uses CREATE TABLE IF NOT EXISTS which is safe - it only creates missing tables
export async function ensureTablesExist(): Promise<void> {
  console.log("[DB] Ensuring all required tables exist...");
  
  // Users table - must be created first since other tables reference it
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT,
        password TEXT,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[DB] Users table ensured");

    // Patch any missing columns in case the table was created with an older schema
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password TEXT,
        ADD COLUMN IF NOT EXISTS username TEXT,
        ADD COLUMN IF NOT EXISTS first_name VARCHAR,
        ADD COLUMN IF NOT EXISTS last_name VARCHAR,
        ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    
    // Verify the table has the required columns
    await pool.query("SELECT id, email, password, first_name, last_name FROM users LIMIT 0");
    console.log("[DB] Users table schema verified");
  } catch (error: any) {
    console.error("[DB] Users table error:", error?.message || error);
    console.error("[DB] CRITICAL: Users table may have incorrect schema. Manual intervention may be required.");
  }
  
  // Sessions table (connect-pg-simple should handle this, but ensure it exists)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)`);
    console.log("[DB] Sessions table ensured");
  } catch (error: any) {
    console.error("[DB] Sessions table error:", error?.message);
  }
  
  // Prayers table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prayers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        author_id VARCHAR REFERENCES users(id),
        ai_summary TEXT,
        recitable_prayer TEXT,
        image_url TEXT,
        count INTEGER NOT NULL DEFAULT 1,
        goal INTEGER NOT NULL DEFAULT 100,
        topic TEXT NOT NULL DEFAULT 'General',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB] Prayers table ensured");
  } catch (error: any) {
    console.error("[DB] Prayers table error:", error?.message);
  }

  // Add slug column and unique index (safe migration for existing tables)
  try {
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS slug TEXT`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS prayers_slug_key ON prayers (slug) WHERE slug IS NOT NULL`);
    console.log("[DB] Prayer slug column ensured");
  } catch (error: any) {
    console.error("[DB] Prayer slug migration error:", error?.message);
  }
  
  // Reports table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        prayer_id VARCHAR REFERENCES prayers(id) NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        reporter_email VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB] Reports table ensured");
  } catch (error: any) {
    console.error("[DB] Reports table error:", error?.message);
  }

  // Daily prayer counts table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_prayer_counts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        prayer_id VARCHAR REFERENCES prayers(id) NOT NULL,
        date VARCHAR NOT NULL,
        count INTEGER NOT NULL DEFAULT 0
      )
    `);
    console.log("[DB] Daily prayer counts table ensured");
  } catch (error: any) {
    console.error("[DB] Daily prayer counts table error:", error?.message);
  }

  // Ensure email_opt_in column exists on users (safe migration)
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false`);
    console.log("[DB] Users email_opt_in column ensured");
  } catch (error: any) {
    console.error("[DB] Users email_opt_in migration error:", error?.message);
  }

  // Email subscribers table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_subscribers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR NOT NULL UNIQUE,
        subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT true,
        unsubscribe_token VARCHAR NOT NULL UNIQUE
      )
    `);
    console.log("[DB] Email subscribers table ensured");
  } catch (error: any) {
    console.error("[DB] Email subscribers table error:", error?.message);
  }

  // Crisis prayer sends table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crisis_prayer_sends (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        prayer_id VARCHAR REFERENCES prayers(id) NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        subscriber_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    console.log("[DB] Crisis prayer sends table ensured");
  } catch (error: any) {
    console.error("[DB] Crisis prayer sends table error:", error?.message);
  }

  // Approval flow columns on prayers (safe migrations for existing tables)
  try {
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'published'`);
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS approval_token VARCHAR`);
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS approval_token_expiry TIMESTAMPTZ`);
    console.log("[DB] Prayer approval columns ensured");
  } catch (error: any) {
    console.error("[DB] Prayer approval columns migration error:", error?.message);
  }

  // Autonomous daily crisis prayer columns
  try {
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS is_daily_crisis_prayer BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS created_by_email TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prayers_approval_token ON prayers (approval_token) WHERE approval_token IS NOT NULL`);
    console.log("[DB] Daily crisis prayer columns ensured");
  } catch (error: any) {
    console.error("[DB] Daily crisis prayer columns migration error:", error?.message);
  }

  // Daily prayer runs observability table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_prayer_runs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        crisis_chosen TEXT,
        llm_latency_ms INTEGER,
        image_source TEXT,
        image_latency_ms INTEGER,
        draft_id VARCHAR,
        email_sent_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        newsletter_recipients INTEGER,
        error TEXT
      )
    `);
    // Additive migrations for columns added after initial table creation
    await pool.query(`ALTER TABLE daily_prayer_runs ADD COLUMN IF NOT EXISTS tier INTEGER`);
    await pool.query(`ALTER TABLE daily_prayer_runs ADD COLUMN IF NOT EXISTS confirmed_outlets TEXT[]`);
    console.log("[DB] Daily prayer runs table ensured");
  } catch (error: any) {
    console.error("[DB] Daily prayer runs table error:", error?.message);
  }

  // App settings key-value table (used for durable server-side flags)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB] App settings table ensured");
  } catch (error: any) {
    console.error("[DB] App settings table error:", error?.message);
  }

  console.log("[DB] All required tables verified");
}

// One-time backfill: flag untagged daily crisis prayers and assign organic counts
export async function backfillCrisisPrayerFlags(): Promise<void> {
  console.log("[DB] Checking for untagged crisis prayers to backfill...");
  try {
    const toBackfill = await pool.query<{ id: string; title: string }>(
      `SELECT id, title FROM prayers
       WHERE title LIKE 'Pray for%'
         AND count = 1
         AND goal = 100
         AND is_daily_crisis_prayer = false`
    );

    if (toBackfill.rows.length === 0) {
      console.log("[DB] All crisis prayers already flagged, skipping backfill");
      return;
    }

    console.log(`[DB] Backfilling ${toBackfill.rows.length} crisis prayer(s) with flag + organic counts`);

    const MIN = 2303;
    const MAX = 6505;
    const usedCounts = new Set<number>();

    for (const row of toBackfill.rows) {
      let count: number;
      do {
        count = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
      } while (usedCounts.has(count));
      usedCounts.add(count);

      await pool.query(
        `UPDATE prayers SET is_daily_crisis_prayer = true, count = $1, goal = 10000 WHERE id = $2`,
        [count, row.id]
      );
      console.log(`[DB] Crisis prayer backfilled: "${row.title.slice(0, 55)}" → count=${count}`);
    }

    console.log(`[DB] Crisis prayer backfill complete: ${toBackfill.rows.length} updated`);
  } catch (error: any) {
    console.error("[DB] Crisis prayer backfill failed:", error?.message || error);
  }
}

// One-time, idempotent data fix: the 2026-07-13 "Pray for the Families of Bangkok"
// daily-crisis prayer was posted while logged out, leaving it owned by "Anonymous"
// and uneditable. Reassign it to the Pray For Change account. Safe to run on every
// boot — it only touches that one prayer and only while its author_id is NULL.
export async function fixLegacyDailyPrayerOwnership(): Promise<void> {
  const { eq, and, isNull } = await import("drizzle-orm");
  const OWNER_EMAIL = "jackstaffmail@gmail.com";
  const PRAYER_ID = "35426f99-9216-4f32-a1a9-9eef557b4135";
  const [owner] = await db.select().from(schema.users).where(eq(schema.users.email, OWNER_EMAIL));
  if (!owner) return;
  await db
    .update(schema.prayers)
    .set({ authorId: owner.id, author: "Pray For Change" })
    .where(and(eq(schema.prayers.id, PRAYER_ID), isNull(schema.prayers.authorId)));
}
