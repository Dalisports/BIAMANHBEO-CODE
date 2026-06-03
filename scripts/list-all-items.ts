import pg from "pg";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function listItems(name: string, connectionString: string) {
  console.log(`\n========================================`);
  console.log(`LISTING ALL ITEMS IN DATABASE: ${name}`);
  console.log(`========================================`);
  
  const pool = new Pool({ connectionString });
  try {
    const catRes = await pool.query("SELECT * FROM categories ORDER BY id");
    const menuRes = await pool.query("SELECT * FROM menu_items ORDER BY name, id");
    
    console.log(`Total items: ${menuRes.rows.length}`);
    menuRes.rows.forEach(item => {
      const cat = catRes.rows.find(c => c.id === item.category_id);
      console.log(`ID: ${item.id.toString().padEnd(4)} | Name: ${item.name.padEnd(30)} | Price: ${item.price.toString().padEnd(8)} | Category: ${cat ? cat.name : 'null'} | Active: ${item.is_active} | Hidden: ${item.is_hidden}`);
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  await listItems("NEW DB (gentle-shadow)", NEW_DB);
}

main().catch(console.error);
