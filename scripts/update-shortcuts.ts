import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateShortcuts() {
  try {
    await pool.query(`DROP TABLE IF EXISTS shortcuts`);
    await pool.query(`
      CREATE TABLE shortcuts (
        id SERIAL PRIMARY KEY,
        position INTEGER NOT NULL UNIQUE CHECK (position BETWEEN 8 AND 10),
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO shortcuts (position) VALUES (8), (9), (10)`);
    console.log("Created shortcuts table with positions 8-10");
  } catch (e) {
    console.log(e.message);
  } finally {
    await pool.end();
  }
}

updateShortcuts();