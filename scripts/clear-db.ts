import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  
  try {
    const tables = ['kitchen_orders', 'orders', 'menu_items', 'categories', 'settings', 'payment_settings', 'user_profiles', 'daily_qr_codes', 'attendance_records', 'users'];
    
    for (const table of tables) {
      await client.query(`DELETE FROM ${table}`);
      console.log(`✅ Cleared ${table}`);
    }
    
    console.log("\n✅ All tables cleared!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);