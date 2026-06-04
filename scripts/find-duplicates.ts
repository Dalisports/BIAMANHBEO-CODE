import pg from "pg";

const { Pool } = pg;

const OLD_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function analyzeDatabase(name: string, connectionString: string) {
  console.log(`\n========================================`);
  console.log(`ANALYZING DATABASE: ${name}`);
  console.log(`========================================`);
  
  const pool = new Pool({ connectionString });
  try {
    // 1. Categories
    const catRes = await pool.query("SELECT * FROM categories ORDER BY id");
    console.log("\n--- Categories ---");
    catRes.rows.forEach(c => {
      console.log(`ID: ${c.id} | Name: "${c.name}" | Display Order: ${c.display_order}`);
    });
    
    // 2. Menu Items
    const menuRes = await pool.query("SELECT * FROM menu_items ORDER BY id");
    console.log(`\nTotal Menu Items: ${menuRes.rows.length}`);
    
    // 3. Find duplicate menu item names
    const nameCount: Record<string, any[]> = {};
    menuRes.rows.forEach(item => {
      if (!nameCount[item.name]) {
        nameCount[item.name] = [];
      }
      nameCount[item.name].push(item);
    });
    
    console.log("\n--- Duplicate Menu Item Names ---");
    let duplicateCount = 0;
    Object.entries(nameCount).forEach(([itemName, items]) => {
      if (items.length > 1) {
        duplicateCount++;
        console.log(`Name: "${itemName}" (Found ${items.length} times):`);
        items.forEach(it => {
          const cat = catRes.rows.find(c => c.id === it.category_id);
          console.log(`  - ID: ${it.id} | Category: ${cat ? `[${cat.id}] ${cat.name}` : `[${it.category_id}] (Unknown)`} | Price: ${it.price}đ | Active: ${it.is_active} | Hidden: ${it.is_hidden}`);
        });
      }
    });
    
    if (duplicateCount === 0) {
      console.log("No duplicate menu item names found.");
    } else {
      console.log(`Total duplicate names: ${duplicateCount}`);
    }
    
    // 4. Check if we have two different set of categories or IDs
    console.log("\n--- Menu items with category_id that doesn't exist in categories table ---");
    const invalidCatItems = menuRes.rows.filter(it => !catRes.rows.some(c => c.id === it.category_id));
    console.log(`Count: ${invalidCatItems.length}`);
    if (invalidCatItems.length > 0) {
      console.log("Sample invalid category items:");
      invalidCatItems.slice(0, 10).forEach(it => {
        console.log(`  - ID: ${it.id} | Name: "${it.name}" | Category ID: ${it.category_id}`);
      });
    }

  } catch (err: any) {
    console.error("Error analyzing db:", err.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  await analyzeDatabase("NEW DB (gentle-shadow)", NEW_DB);
  await analyzeDatabase("OLD DB (ancient-brook)", OLD_DB);
}

main().catch(console.error);
