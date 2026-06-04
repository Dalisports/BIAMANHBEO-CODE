import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { MenuItem, Category, Order, KitchenOrder, PaymentSetting, User, Setting, UserProfile, DailyQRCode, Conversation, Message, AttendanceRecord } from "../shared/schema.js";

const { Pool } = pg;

const neonUrl = process.env.DATABASE_URL;
const flyUrl = "postgresql://fly-user:xQ61Gh6B1sjF0ovDuRX5gddU@pgbouncer.vmkq609j3dlo35ln.flympg.net/fly-db";

async function migrate() {
  console.log("🔄 Migrating Neon → Fly Postgres\n");

  const neonPool = new Pool({ connectionString: neonUrl });
  const flyPool = new Pool({ connectionString: flyUrl });

  const neonDb = drizzle(neonPool);
  const flyDb = drizzle(flyPool);

  const tables = [
    { name: "categories", schema: null as any },
    { name: "settings", schema: null as any },
    { name: "menu_items", schema: null as any },
    { name: "orders", schema: null as any },
    { name: "kitchen_orders", schema: null as any },
    { name: "payment_settings", schema: null as any },
    { name: "users", schema: null as any },
    { name: "user_profiles", schema: null as any },
    { name: "daily_qr_codes", schema: null as any },
    { name: "conversations", schema: null as any },
    { name: "messages", schema: null as any },
    { name: "attendance_records", schema: null as any },
  ];

  for (const table of tables) {
    console.log(`📦 Migrating ${table.name}...`);
    
    try {
      const result = await neonPool.query(`SELECT * FROM ${table.name}`);
      const rows = result.rows;
      console.log(`   Found ${rows.length} rows in Neon`);
      
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const values = rows.map((row, i) => {
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