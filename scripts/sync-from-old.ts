import pg from "pg";

const { Pool } = pg;
const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const oldPool = new Pool({ connectionString: OLD_DB });
const newPool = new Pool({ connectionString: NEW_DB });

async function main() {
  console.log("Syncing data...\n");
  
  const tables = ['users', 'categories', 'menu_items', 'orders', 'payment_settings', 'settings'];
  
  for (const table of tables) {
    console.log(`📦 ${table}...`);
    const result = await oldPool.query(`SELECT * FROM ${table}`);
    const rows = result.rows;
    console.log(`   Found ${rows.length} rows`);
    
    if (rows.length === 0) continue;
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      
      try {
        await newPool.query(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      } catch (e) {}
    }
    console.log(`   ✅ Synced ${rows.length} rows`);
  }
  
  console.log("\n✅ Done!");
  await oldPool.end();
  await newPool.end();
}

main().catch(console.error);