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
