import pg from "pg";
import Database from "better-sqlite3";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const SQLITE_DB = "./biamanhbeo.sqlite";

async function checkSqlite() {
  console.log("=== SQLITE LOCAL ===");
  try {
    const db = new Database(SQLITE_DB);
    const categories = db.prepare("SELECT * FROM categories").all() as any[];
    const menuItems = db.prepare("SELECT * FROM menu_items").all() as any[];
    console.log(`Categories count: ${categories.length}`);
    console.log(`Menu items count: ${menuItems.length}`);
    
    // In ra 5 món đầu tiên
    console.log("Sample items (first 5):");
    menuItems.slice(0, 5).forEach(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      console.log(`- [${cat ? cat.name : 'Unknown'}] ${item.name} (${item.price}đ)`);
    });
    db.close();
  } catch (err: any) {
    console.error("Error reading SQLite:", err.message);
  }
}

async function checkPostgres(name: string, connectionString: string) {
  console.log(`\n=== POSTGRES: ${name} ===`);
  const pool = new Pool({ connectionString });
  try {
    const catResult = await pool.query("SELECT * FROM categories ORDER BY id");
    const menuResult = await pool.query("SELECT * FROM menu_items ORDER BY id");
    console.log(`Categories count: ${catResult.rows.length}`);
    console.log(`Menu items count: ${menuResult.rows.length}`);
    
    // In ra 10 món đầu tiên
    console.log("Sample items (first 10):");
    menuResult.rows.slice(0, 10).forEach(item => {
      const cat = catResult.rows.find(c => c.id === item.category_id);
      console.log(`- ID: ${item.id} - [${cat ? cat.name : 'Unknown'}] ${item.name} (${item.price}đ) - Active: ${item.is_active}`);
    });
  } catch (err: any) {
    console.error(`Error reading ${name}:`, err.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  await checkSqlite();
  await checkPostgres("OLD DB (ancient-brook)", OLD_DB);
  await checkPostgres("NEW DB (gentle-shadow)", NEW_DB);
}

main().catch(console.error);
