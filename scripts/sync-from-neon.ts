import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const localDb = new Database("./biamanhbeo.sqlite");
const oldPool = new Pool({ connectionString: OLD_DB });

const tables = [
  "users",
  "categories",
  "menu_items",
  "orders",
  "payment_settings",
  "settings",
];

console.log("🚀 Syncing old Neon → SQLite local\n");

for (const table of tables) {
  console.log(`📦 ${table}...`);
  
  const result = await oldPool.query(`SELECT * FROM ${table}`);
  const rows = result.rows;
  console.log(`   Found ${rows.length} rows`);
  
  if (rows.length === 0) continue;

  for (const row of rows) {
    try {
      const columns = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders})`;
      
      localDb.prepare(sql).run(...values);
    } catch (e: any) {
      if (!e.message.includes('UNIQUE constraint')) {
        console.log(`   ⚠️ ${e.message}`);
      }
    }
  }
  
  console.log(`   ✅ Synced ${rows.length} rows`);
}

console.log("\n✅ Done!");
localDb.close();
await oldPool.end();