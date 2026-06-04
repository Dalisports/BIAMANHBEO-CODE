import Database from "better-sqlite3";
import pg from "pg";
const { Pool } = pg;

const localDb = new Database("./biamanhbeo.sqlite");

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  console.log("🚀 Syncing menu_items local → Neon...");
  
  const items = localDb.prepare("SELECT * FROM menu_items").all();
  console.log(`   Local: ${items.length} items`);
  
  for (const item of items) {
    await pool.query(
      `INSERT INTO menu_items (id, name, price, category_id, description, image, is_available, is_active, is_sticky, is_priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price`,
      [
        item.id,
        item.name,
        item.price,
        item.categoryId || null,
        item.description || null,
        item.image || null,
        item.isAvailable ? true : false,
        item.isActive ? true : false,
        item.isSticky ? true : false,
        item.isPriority ? true : false,
        item.createdAt || new Date()
      ]
    );
  }
  
  const countResult = await pool.query("SELECT COUNT(*) as c FROM menu_items");
  console.log(`   Neon after sync: ${countResult.rows[0].c} items`);
  
  console.log("✅ Done!");
  await pool.end();
  localDb.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });