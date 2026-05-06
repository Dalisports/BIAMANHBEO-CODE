import pg from "pg";

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const { Pool } = pg;
const oldPool = new Pool({ connectionString: OLD_DB });
const newPool = new Pool({ connectionString: NEW_DB });

async function main() {
  console.log("Checking menu_items...\n");
  
  // Check old DB
  const oldResult = await oldPool.query("SELECT * FROM menu_items LIMIT 2");
  console.log("Old DB sample:", JSON.stringify(oldResult.rows, null, 2));
  
  // Check new DB schema
  const schemaResult = await newPool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'menu_items'
  `);
  console.log("\nNew DB schema:", JSON.stringify(schemaResult.rows, null, 2));
  
  await oldPool.end();
  await newPool.end();
}

main().catch(console.error);