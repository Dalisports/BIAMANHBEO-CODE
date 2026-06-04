import { config as dotenv } from "dotenv";
import pg from "pg";

dotenv({ path: "./.env" });

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");
  
  const tables = ['users', 'categories', 'menu_items', 'orders', 'payment_settings', 'settings'];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} rows`);
    } catch (e) {
      console.log(`${table}: ERROR - ${e.message}`);
    }
  }
  
  await pool.end();
}

main().catch(console.error);