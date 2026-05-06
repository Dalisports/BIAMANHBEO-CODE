import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`);
    console.log("Migration done: is_hidden column added");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("Column already exists");
    } else {
      console.error("Migration error:", e);
    }
  }
  process.exit(0);
}

migrate();