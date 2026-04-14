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
    
    // Verify the table has the required columns by doing a simple test query
    const testResult = await pool.query("SELECT id, email, password, first_name, last_name FROM users LIMIT 0");
    console.log("[DB] Users table schema verified");
  } catch (error: any) {
    console.error("[DB] Users table error:", error?.message || error);
    // If schema is wrong, log the issue but don't drop the table
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

  console.log("[DB] All required tables verified");
}
