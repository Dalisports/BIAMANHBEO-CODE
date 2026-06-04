import pg from "pg";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const LOCAL_DB = "./biamanhbeo.sqlite";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const oldPool = new Pool({ connectionString: OLD_DB });
const newPool = new Pool({ connectionString: NEW_DB });

async function main() {
  console.log("Checking old Neon DB...\n");
  
  const tables = ['users', 'categories', 'menu_items', 'orders', 'payment_settings', 'settings'];
  
  for (const table of tables) {
    const result = await oldPool.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`${table}: ${result.rows[0].count} rows`);
  }
  
  await oldPool.end();
  await newPool.end();
}

main().catch(console.error);