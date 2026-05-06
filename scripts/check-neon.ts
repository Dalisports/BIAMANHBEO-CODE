import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log("Neon tables:");
  result.rows.forEach(r => console.log("  -", r.table_name));
  
  const countResult = await pool.query("SELECT COUNT(*) as c FROM menu_items");
  console.log("\nmenu_items:", countResult.rows[0].c, "rows");
  
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });