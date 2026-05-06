import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const localDb = new Database("./biamanhbeo.sqlite");
const neonPool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log("🚀 Syncing users...");
  
  const users = localDb.prepare("SELECT * FROM users").all();
  console.log(`   Found ${users.length} users`);
  
  for (const user of users) {
    try {
      await neonPool.query(
        `INSERT INTO users (id, username, password, role, "fullName", "isActive", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          (user as any).id,
          (user as any).username,
          (user as any).password,
          (user as any).role,
          (user as any).fullName,
          (user as any).isActive,
          (user as any).createdAt
        ]
      );
    } catch (e: any) {
      console.log(`   ⚠️ ${e.message}`);
    }
  }
  
  console.log("✅ Done!");
  await neonPool.end();
  localDb.close();
}

main().catch(e => { console.error(e); process.exit(1); });