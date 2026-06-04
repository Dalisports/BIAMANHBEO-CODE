import pg from "pg";

const { Pool } = pg;
const DATABASE_URL = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log("Checking all tables in the new database...\n");
  
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  
  console.log("Tables found:", result.rows.length);
  for (const row of result.rows) {
    console.log("  -", row.table_name);
  }
  
  await pool.end();
}

main().catch(console.error);