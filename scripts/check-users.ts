import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query("SELECT * FROM users");
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

main().catch(console.error);