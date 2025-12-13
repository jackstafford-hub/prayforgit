import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import * as fs from "fs";

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
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return process.env.DATABASE_URL;
}

export const databaseUrl = getDatabaseUrl();

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
