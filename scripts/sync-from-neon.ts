import Database from "better-sqlite3";
import pg from "pg";
import fs from "fs";

const { Pool } = pg;

const NEON_DB = "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const LOCAL_DB_PATH = "./biamanhbeo.sqlite";
const localDb = new Database(LOCAL_DB_PATH);
const neonPool = new Pool({ connectionString: NEON_DB });

const TABLES_TO_SYNC = [
  "users",
  "menu_items",
  "orders",
  "payment_settings",
  "settings",
];

function getLocalColumns(db: Database.Database, table: string): string[] {
  const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
  return info.map((c) => c.name);
}

function convertValue(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "bigint") return Number(v);
  return v;
}

async function main() {
  // 1. Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = `./biamanhbeo_backup_${timestamp}.sqlite`;
  console.log("📦 Backing up local database...");
  fs.copyFileSync(LOCAL_DB_PATH, backupPath);
  console.log(`   ✅ Backup saved: ${backupPath}\n`);

  // 2. Clear local data (except categories)
  console.log("🗑️  Clearing local data (keeping categories)...");
  for (const table of TABLES_TO_SYNC) {
    try {
      const info = localDb.prepare(`DELETE FROM "${table}"`).run();
      console.log(`   ✅ Cleared ${table} (${info.changes} rows deleted)`);
    } catch (e: any) {
      console.log(`   ⚠️  ${table}: ${e.message}`);
    }
  }
  console.log("");

  // 3. Sync from Neon
  console.log("🚀 Syncing from Neon → Local\n");

  for (const table of TABLES_TO_SYNC) {
    console.log(`📦 ${table}...`);

    const localColumns = getLocalColumns(localDb, table);
    console.log(`   Local columns: ${localColumns.join(", ")}`);

    const result = await neonPool.query(`SELECT * FROM ${table}`);
    const rows = result.rows;
    console.log(`   Found ${rows.length} rows in Neon`);

    if (rows.length === 0) {
      console.log(`   ⏭️  Skipping (no data)\n`);
      continue;
    }

    let synced = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const rowColumns = Object.keys(row);
        const commonColumns = rowColumns.filter((c) => localColumns.includes(c));

        if (commonColumns.length === 0) {
          skipped++;
          continue;
        }

        const values = commonColumns.map((c) => convertValue(row[c]));
        const placeholders = commonColumns.map(() => "?").join(", ");
        const sql = `INSERT INTO "${table}" (${commonColumns.join(", ")}) VALUES (${placeholders})`;

        localDb.prepare(sql).run(...values);
        synced++;
      } catch (e: any) {
        if (!e.message.includes("UNIQUE constraint")) {
          console.log(`   ⚠️  Row error: ${e.message}`);
        }
      }
    }

    console.log(`   ✅ Synced ${synced}/${rows.length} rows (${skipped} skipped due to schema mismatch)\n`);
  }

  // 4. Verify
  console.log("🔍 Verification (local row counts):");
  for (const table of ["users", "categories", "menu_items", "orders", "payment_settings", "settings"]) {
    try {
      const info = localDb.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get() as { c: number };
      console.log(`   ${table}: ${info.c} rows`);
    } catch (e: any) {
      console.log(`   ${table}: ⚠️  ${e.message}`);
    }
  }

  console.log("\n✅ Done!");
  localDb.close();
  await neonPool.end();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});