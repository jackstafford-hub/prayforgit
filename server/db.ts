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

// Ensure all required tables exist in production
export async function ensureTablesExist(): Promise<void> {
  console.log("[DB] Checking if all required tables exist...");
  
  const createUsersTable = `
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
    );
  `;
  
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
  `;
  
  const createPrayersTable = `
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
    );
  `;
  
  const createReportsTable = `
    CREATE TABLE IF NOT EXISTS reports (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      prayer_id VARCHAR REFERENCES prayers(id) NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      reporter_email VARCHAR,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  try {
    // Create tables in order (users first due to foreign key references)
    await pool.query(createUsersTable);
    console.log("[DB] Users table ensured");
    
    await pool.query(createSessionsTable);
    console.log("[DB] Sessions table ensured");
    
    await pool.query(createPrayersTable);
    console.log("[DB] Prayers table ensured");
    
    await pool.query(createReportsTable);
    console.log("[DB] Reports table ensured");
    
    console.log("[DB] All required tables exist");
  } catch (error: any) {
    console.error("[DB] Failed to ensure tables exist:", error?.message || error);
    throw error;
  }
}
