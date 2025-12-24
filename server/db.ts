import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import * as fs from "fs";

const LOG_DB_DIAGNOSTICS = process.env.LOG_DB_DIAGNOSTICS === "true";

function logDbDiag(message: string) {
  if (LOG_DB_DIAGNOSTICS) {
    console.log(`[DB_DIAG] ${message}`);
  }
}

function getDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
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
    logDbDiag("DATABASE_URL missing");
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return process.env.DATABASE_URL;
}

export const databaseUrl = getDatabaseUrl();

// Log only the hostname (safe, no secrets)
if (LOG_DB_DIAGNOSTICS && databaseUrl) {
  try {
    const dbHost = new URL(databaseUrl).hostname;
    logDbDiag(`DB host: ${dbHost}`);
  } catch {
    logDbDiag("Could not parse DATABASE_URL for hostname");
  }
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });

// Non-blocking DB connectivity check with short timeout
export async function checkDbConnectivity(): Promise<boolean> {
  const client = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 4000, // 4 second timeout
  });
  
  try {
    const result = await client.query("SELECT 1");
    logDbDiag("DB connectivity check: OK");
    await client.end();
    return true;
  } catch (error: any) {
    const code = error?.code || error?.message || "UNKNOWN";
    logDbDiag(`DB connectivity check failed: ${code}`);
    try {
      await client.end();
    } catch {}
    return false;
  }
}
