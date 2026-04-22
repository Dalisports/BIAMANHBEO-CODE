import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  const result = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_items' ORDER BY ordinal_position"
  );
  console.log("Neon menu_items columns:");
  result.rows.forEach(r => console.log("  -", r.column_name));
  
  const local = require("better-sqlite3")("./biamanhbeo.sqlite");
  const localSchema = local.prepare("PRAGMA table_info(menu_items)").all();
  console.log("\nLocal menu_items columns:");
  localSchema.forEach(c => console.log("  -", c.name));
  
  await pool.end();
  local.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });