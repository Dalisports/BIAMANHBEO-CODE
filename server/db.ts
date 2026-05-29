import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    console.log("[DB] Initializing connection pool...");
    console.log("[DB] Connection string host:", connectionString.match(/@([^:]+):/)?.[1] || "unknown");
    
    _pool = new Pool({ 
      connectionString,
      ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    });
    
    _pool.on('error', (err) => {
      console.error("[DB] Pool error:", err.message);
    });
    
    _pool.on('connect', () => {
      console.log("[DB] New client connected");
    });
    
    _db = drizzle(_pool, { schema });
    console.log("[DB] Drizzle instance created");
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});
