import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id SERIAL PRIMARY KEY,
        position INTEGER NOT NULL UNIQUE CHECK (position BETWEEN 7 AND 9),
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created shortcuts table");
    
    await pool.query(`INSERT INTO shortcuts (position) VALUES (7), (8), (9) ON CONFLICT (position) DO NOTHING;`);
    console.log("Inserted default shortcuts");
  } catch (e) {
    console.log(e.message);
  } finally {
    await pool.end();
  }
}

createTable();