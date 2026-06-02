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

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function mapRowToCamelCase(row: any): any {
  const newRow: any = {};
  for (const key of Object.keys(row)) {
    const camelKey = toCamelCase(key);
    let val = row[key];
    
    // Parse JSON string for jsonb columns (like 'items')
    if (key === "items" && typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    
    // Cast SQLite booleans (1/0) to actual JS booleans for PostgreSQL
    if (camelKey.startsWith("is") && (val === 1 || val === 0)) {
      val = val === 1;
    }
    
    // Convert SQLite date/timestamp strings to actual JS Date objects
    if (camelKey.endsWith("At") && val !== null && val !== undefined && val !== "") {
      const parsedDate = new Date(val);
      if (!isNaN(parsedDate.getTime())) {
        val = parsedDate;
      }
    }
    
    newRow[camelKey] = val;
  }
  return newRow;
}

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

  let count = 0;
  for (const row of rows) {
    try {
      const mappedRow = mapRowToCamelCase(row);
      await neonDb.insert(tableSchema).values(mappedRow).onConflictDoNothing();
      count++;
    } catch (e: any) {
      console.log(`   ⚠️ Error inserting row ID ${(row as any).id || 'unknown'}: ${e.message}`);
    }
  }
  
  console.log(`   ✅ Synced ${count}/${rows.length} rows`);
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