import { config as dotenv } from "dotenv";
import pg from "pg";

dotenv({ path: "./database.env" });

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("Creating users table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      full_name TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ users table created");
  
  console.log("Creating settings table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ settings table created");
  
  await pool.end();
  console.log("\n✅ All tables created!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});