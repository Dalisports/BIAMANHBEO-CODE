import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let _db: any = null;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const isPostgres = connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://");

    if (isPostgres) {
      console.log("[DB] Initializing PostgreSQL database connection pool...");
      const pool = new Pool({
        connectionString,
        ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false }
      });
      _db = drizzlePg(pool, { schema });
      console.log("[DB] Drizzle PostgreSQL instance created");
    } else {
      const dbPath = connectionString.replace("file:", "");
      console.log("[DB] Initializing SQLite database at:", dbPath);
      const sqlite = new Database(dbPath);
      _db = drizzleSqlite(sqlite, { schema });
      console.log("[DB] Drizzle SQLite instance created");
    }
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzleSqlite>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzleSqlite>];
  }
});
