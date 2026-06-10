import pg from "pg";
import Database from "better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "../shared/schema";

const neonUrl = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sqlitePath = "./biamanhbeo.sqlite";

async function sync() {
  console.log("Starting sync from Neon to SQLite...");
  const pgPool = new pg.Pool({ connectionString: neonUrl });
  const sqlite = new Database(sqlitePath);
  
  const pgDb = drizzlePg(pgPool, { schema });
  const sqliteDb = drizzleSqlite(sqlite, { schema });

  const tables = [
    { name: "categories", schema: schema.categories },
    { name: "settings", schema: schema.settings },
    { name: "menu_items", schema: schema.menuItems },
    { name: "orders", schema: schema.orders },
    { name: "kitchen_orders", schema: schema.kitchenOrders },
    { name: "payment_settings", schema: schema.paymentSettings },
    { name: "users", schema: schema.users },
    { name: "user_profiles", schema: schema.userProfiles },
    { name: "daily_qr_codes", schema: schema.dailyQRCodes },
    { name: "conversations", schema: schema.conversations },
    { name: "messages", schema: schema.messages },
    { name: "attendance_records", schema: schema.attendanceRecords },
    { name: "shortcuts", schema: schema.shortcuts },
    { name: "products", schema: schema.products },
    { name: "instructions", schema: schema.instructions },
    { name: "memory", schema: schema.memory },
  ];

  for (const table of tables) {
    console.log(`Syncing table: ${table.name}...`);
    try {
      // 1. Fetch data from Neon
      const result = await pgPool.query(`SELECT * FROM ${table.name}`);
      const rows = result.rows;
      console.log(`   Found ${rows.length} rows in Neon.`);

      // 2. Clear SQLite table
      sqlite.prepare(`DELETE FROM ${table.name}`).run();
      console.log(`   Cleared SQLite table ${table.name}.`);

      // 3. Insert rows into SQLite
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const insertStmt = sqlite.prepare(
          `INSERT INTO ${table.name} (${columns.join(", ")}) VALUES (${placeholders})`
        );

        const insertMany = sqlite.transaction((data) => {
          for (const row of data) {
            const values = columns.map((col) => {
              const val = row[col];
              if (val !== null && typeof val === "object" && !(val instanceof Date)) {
                return JSON.stringify(val);
              }
              if (val instanceof Date) {
                return val.getTime();
              }
              if (typeof val === "boolean") {
                return val ? 1 : 0;
              }
              return val;
            });
            insertStmt.run(...values);
          }
        });

        insertMany(rows);
        console.log(`   ✅ Synced ${rows.length} rows.`);
      }
    } catch (err: any) {
      console.log(`   ⚠️ Skipped ${table.name}:`, err.message);
    }
  }

  await pgPool.end();
  sqlite.close();
  console.log("Sync completed successfully!");
}

sync().catch(console.error);
