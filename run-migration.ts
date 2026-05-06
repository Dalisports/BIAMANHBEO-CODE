import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { categories, settings, menuItems, orders, kitchenOrders, paymentSettings, users, userProfiles, dailyQRCodes, conversations, messages, attendanceRecords } from "../shared/schema.js";

const { Pool } = pg;

const neonUrl = process.env.DATABASE_URL;
const flyUrl = process.env.DATABASE_URL;

async function migrate() {
  console.log("🔄 Migrating Neon → Fly Postgres\n");

  const neonPool = new Pool({ connectionString: neonUrl });
  const flyPool = new Pool({ connectionString: flyUrl });

  const neonDb = drizzle(neonPool);
  const flyDb = drizzle(flyPool);

  const tables = [
    { name: "categories", schema: categories },
    { name: "settings", schema: settings },
    { name: "menu_items", schema: menuItems },
    { name: "orders", schema: orders },
    { name: "kitchen_orders", schema: kitchenOrders },
    { name: "payment_settings", schema: paymentSettings },
    { name: "users", schema: users },
    { name: "user_profiles", schema: userProfiles },
    { name: "daily_qr_codes", schema: dailyQRCodes },
    { name: "conversations", schema: conversations },
    { name: "messages", schema: messages },
    { name: "attendance_records", schema: attendanceRecords },
  ];

  for (const table of tables) {
    console.log(`📦 Migrating ${table.name}...`);
    
    try {
      const result = await neonPool.query(`SELECT * FROM ${table.name}`);
      const rows = result.rows;
      console.log(`   Found ${rows.length} rows in Neon`);
      
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const values = rows.map((row) => {
          const vals = columns.map((col) => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          return `(${vals.join(', ')})`;
        }).join(', ');

        const colList = columns.join(', ');
        await flyPool.query(`INSERT INTO ${table.name} (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`);
        console.log(`   ✅ Migrated ${rows.length} rows`);
      }
    } catch (e: any) {
      console.log(`   ⚠️ Error: ${e.message}`);
    }
  }

  console.log("\n✅ Migration complete!");
  await neonPool.end();
  await flyPool.end();
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});