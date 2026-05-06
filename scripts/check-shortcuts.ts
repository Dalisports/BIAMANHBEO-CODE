import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shortcuts'"
    );
    console.log(JSON.stringify(result.rows));
  } catch (e) {
    console.log(e.message);
  } finally {
    await pool.end();
  }
}

check();