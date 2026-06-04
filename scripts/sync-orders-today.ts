import Database from "better-sqlite3";
import pg from "pg";
import fs from "fs";

const { Pool } = pg;

const databaseEnv = fs.readFileSync("./database.env", "utf-8");
const NEON_DB = process.env.DATABASE_URL || databaseEnv.split("DATABASE_URL=")[1].trim();

const LOCAL_DB_PATH = "./biamanhbeo.sqlite";
const localDb = new Database(LOCAL_DB_PATH);
const neonPool = new Pool({
  connectionString: NEON_DB,
  ssl: { rejectUnauthorized: false },
});

const TODAY = new Date().toISOString().slice(0, 10);

function getLocalColumns(db: Database.Database, table: string): string[] {
  const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
  return info.map((c) => c.name);
}

function convertValue(v: any): any {
  if (v === null || undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "bigint") return Number(v);
  return v;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = `./biamanhbeo_backup_${timestamp}.sqlite`;
  console.log(`[${TODAY}] Syncing today's orders from Neon -> Local`);
  fs.copyFileSync(LOCAL_DB_PATH, backupPath);
  console.log(`Backup: ${backupPath}`);

  const localColumns = getLocalColumns(localDb, "orders");
  console.log(`Local columns: ${localColumns.join(", ")}`);

  const result = await neonPool.query(
    `SELECT * FROM orders WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1`,
    [TODAY]
  );
  const rows = result.rows;
  console.log(`Found ${rows.length} orders from today (${TODAY})`);

  if (rows.length === 0) {
    console.log("No orders to sync.");
    localDb.close();
    await neonPool.end();
    return;
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
      const sql = `INSERT INTO "orders" (${commonColumns.join(", ")}) VALUES (${placeholders})`;

      localDb.prepare(sql).run(...values);
      synced++;
    } catch (e: any) {
      if (!e.message.includes("UNIQUE constraint")) {
        console.log(`Row error: ${e.message}`);
      }
    }
  }

  console.log(`Synced ${synced}/${rows.length} rows`);

  const info = localDb.prepare(`SELECT COUNT(*) as c FROM "orders"`).get() as { c: number };
  console.log(`Local orders now: ${info.c} rows`);

  console.log("Done!");
  localDb.close();
  await neonPool.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});