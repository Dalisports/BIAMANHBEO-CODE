import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SALT = "default-salt-change-in-production";
const newPassword = "admin";
const hash = crypto.pbkdf2Sync(newPassword, SALT, 1000, 64, "sha512").toString("hex");

console.log("Updating admin password with hash:", hash);

await pool.query("UPDATE users SET password = $1 WHERE username = 'admin'", [hash]);
console.log("✅ Admin password reset to: admin");

await pool.end();