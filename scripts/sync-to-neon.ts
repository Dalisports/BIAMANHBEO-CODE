import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema";

const { Pool } = pg;

// Local SQLite
const localDb = new Database("./biamanhbeo.sqlite");

// Neon PostgreSQL  
const neonPool = new Pool({ connectionString: process.env.DATABASE_URL });
const neonDb = drizzle(neonPool, { schema });

// Tables to sync
const tables = [
  "users",
  "categories", 
  "menuItems",
  "orders",
  "kitchenOrders",
  "paymentSettings",
  "settings"
];

async function syncTable(tableName: string) {
  console.log(`\n📦 Syncing ${tableName}...`);
  
  const rows = localDb.prepare(`SELECT * FROM ${tableName}`).all();
  console.log(`   Found ${rows.length} rows in local`);
  
  if (rows.length === 0) return;

  // Get table schema
  const tableSchema = schema[tableName as keyof typeof schema];
  if (!tableSchema) {
    console.log(`   ⚠️ No schema found for ${tableName}, skipping`);
    return;
  }

  // Insert to Neon
  for (const row of rows) {
    try {
      await neonDb.insert(tableSchema as any).values(row as any).onConflictDoNothing();
    } catch (e: any) {
      console.log(`   ⚠️ Error: ${e.message}`);
    }
  }
  
  console.log(`   ✅ Synced ${rows.length} rows`);
}

async function main() {
  console.log("🚀 Exporting local SQLite → Neon PostgreSQL\n");
  
  for (const table of tables) {
    await syncTable(table);
  }
  
  console.log("\n✅ Done!");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});