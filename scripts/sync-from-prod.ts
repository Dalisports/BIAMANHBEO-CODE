import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const PROD_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL!;
const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

function parseDbUrl(url: string) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+?)\/([^?]+)/);
  if (!match) throw new Error(`Invalid URL: ${url}`);
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    database: match[4],
  };
}

const prodConfig = parseDbUrl(PROD_URL);

const TABLES = [
  "categories",
  "settings",
  "menu_items",
  "orders",
  "kitchen_orders",
  "payment_settings",
  "users",
  "user_profiles",
  "daily_qr_codes",
  "conversations",
  "messages",
  "attendance_records",
  "shortcuts",
];

async function getTableColumns(pool: pg.Pool, tableName: string) {
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
    [tableName]
  );
  return result.rows;
}

async function exportTable(prodPool: pg.Pool, tableName: string) {
  const result = await prodPool.query(`SELECT * FROM ${tableName}`);
  return result.rows;
}

async function clearTable(localPool: pg.Pool, tableName: string) {
  await localPool.query(`DELETE FROM ${tableName}`);
}

async function importData(localPool: pg.Pool, tableName: string, rows: any[]) {
  if (rows.length === 0) {
    console.log(`  ${tableName}: No data to import`);
    return;
  }

  await clearTable(localPool, tableName);

  for (const row of rows) {
    const columns = Object.keys(row);
    const values = Object.values(row);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const columnNames = columns.join(", ");

    const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

    try {
      await localPool.query(query, values);
    } catch (err: any) {
      console.log(`  Warning: Failed to insert row in ${tableName}: ${err.message}`);
    }
  }

  console.log(`  ${tableName}: Imported ${rows.length} rows`);
}

async function main() {
  console.log("Starting data sync from production to local...\n");

const prodPool = new Pool({
      host: prodConfig.host,
      user: prodConfig.user,
      password: prodConfig.password,
      database: prodConfig.database,
      ssl: { rejectUnauthorized: false },
    });

  const localPool = new Pool({
    connectionString: LOCAL_URL,
  });

  try {
    console.log("Testing connections...");
    await prodPool.query("SELECT 1");
    console.log("  Production: Connected");
    await localPool.query("SELECT 1");
    console.log("  Local: Connected\n");

    for (const table of TABLES) {
      console.log(`Syncing table: ${table}`);
      const rows = await exportTable(prodPool, table);
      console.log(`  Exported ${rows.length} rows from production`);
      await importData(localPool, table, rows);
    }

    console.log("\n✅ Data sync completed successfully!");
  } catch (err) {
    console.error("Error during sync:", err);
    process.exit(1);
  } finally {
    await prodPool.end();
    await localPool.end();
  }
}

main();