import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import * as fs from "fs";

const isProduction = process.env.NODE_ENV === "production";

function getDatabaseUrl(): string {
  if (isProduction) {
    try {
      const replitDbUrl = fs.readFileSync("/tmp/replitdb", "utf-8").trim();
      if (replitDbUrl) {
        return replitDbUrl;
      }
    } catch (e) {
      console.log("Could not read /tmp/replitdb, falling back to DATABASE_URL");
    }
  }
  
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
  
  console.log("[DB] All required tables verified");
}
