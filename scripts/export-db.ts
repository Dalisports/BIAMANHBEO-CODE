import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const oldPool = new Pool({ connectionString: OLD_DB });
const newPool = new Pool({ connectionString: NEW_DB });
const oldDb = drizzle(oldPool);
const newDb = drizzle(newPool);

const tables = [
  "users",
  "categories",
  "menu_items",
  "orders",
  "payment_settings",
  "settings",
  "user_profiles",
  "daily_qr_codes",
  "attendance_records",
];

async function syncTable(tableName: string) {
  console.log(`📦 Syncing ${tableName}...`);
  
  const result = await oldPool.query(`SELECT * FROM ${tableName}`);
  const rows = result.rows;
  console.log(`   Found ${rows.length} rows`);
  
  if (rows.length === 0) return;

  for (const row of rows) {
    try {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      
      await newPool.query(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
    } catch (e: any) {
      console.log(`   ⚠️ Error: ${e.message}`);
    }
  }
  
  console.log(`   ✅ Synced ${rows.length} rows`);
}

async function main() {
  console.log("🚀 Exporting old Neon → new Neon\n");
  
  for (const table of tables) {
    await syncTable(table);
  }
  
  console.log("\n✅ Done!");
  await oldPool.end();
  await newPool.end();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});