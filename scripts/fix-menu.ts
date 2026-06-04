import pg from "pg";

const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const { Pool } = pg;
const newPool = new Pool({ connectionString: NEW_DB });

async function main() {
  console.log("Fixing menu_items table...\n");
  
  // Drop and recreate with full schema
  await newPool.query(`DROP TABLE IF EXISTS menu_items`);
  
  await newPool.query(`
    CREATE TABLE menu_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      description TEXT,
      image TEXT,
      is_available BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      is_sticky BOOLEAN DEFAULT false,
      is_priority BOOLEAN DEFAULT false,
      is_hidden BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ menu_items table recreated with full schema");
  
  await newPool.end();
}

main().catch(console.error);