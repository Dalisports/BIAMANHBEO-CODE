import { config as dotenv } from "dotenv";
dotenv({ path: process.env.NODE_ENV === "development" ? ".env.development" : ".env", override: true });

import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    await db.run(sql`ALTER TABLE menu_items ADD COLUMN is_hidden INTEGER DEFAULT 0`);
    console.log("Migration done: is_hidden column added");
  } catch (e: any) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate column name")) {
      console.log("Column already exists");
    } else {
      console.error("Migration error:", e);
    }
  }
  process.exit(0);
}

migrate();