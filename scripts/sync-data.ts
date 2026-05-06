import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { menuItems, categories, orders, kitchenOrders, paymentSettings, settings, users } from "../shared/schema.js";

const { Pool } = pg;

const localDb = new Database("./biamanhbeo.sqlite");

const neonPool = new Pool({ connectionString: process.env.DATABASE_URL });
const neonDb = drizzle(neonPool);

const tableMap: Record<string, any> = {
  users,
  categories, 
  menu_items: menuItems,
  orders,
  kitchen_orders: kitchenOrders,
  payment_settings: paymentSettings,
  settings
};

async function syncTable(tableName: string) {
  console.log(`\n📦 Syncing ${tableName}...`);
  
  const rows = localDb.prepare(`SELECT * FROM "${tableName}"`).all();
  console.log(`   Found ${rows.length} rows in local`);
  
  if (rows.length === 0) return;

  const tableSchema = tableMap[tableName];
  if (!tableSchema) {
    console.log(`   ⚠️ No schema found for ${tableName}, skipping`);
    return;
  }

  for (const row of rows) {
    try {
      await neonDb.insert(tableSchema).values(row as any).onConflictDoNothing();
    } catch (e: any) {
      console.log(`   ⚠️ Error: ${e.message}`);
    }
  }
  
  console.log(`   ✅ Synced ${rows.length} rows`);
}

async function main() {
  console.log("🚀 Exporting local SQLite → Neon PostgreSQL\n");
  
  for (const tableName of Object.keys(tableMap)) {
    await syncTable(tableName);
  }
  
  console.log("\n✅ Done!");
  await neonPool.end();
  localDb.close();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});