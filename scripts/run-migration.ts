import { config as dotenv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

dotenv({ path: "./database.env" });

const { Pool } = pg;

async function main() {
  console.log("Running migrations...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("✅ Migrations complete!");
  
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});