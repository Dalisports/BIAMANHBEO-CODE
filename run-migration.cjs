const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const sql = `
    CREATE TABLE IF NOT EXISTS "payment_settings" (
      "id" serial PRIMARY KEY,
      "method" text NOT NULL UNIQUE,
      "label" text,
      "icon" text,
      "qr_image_url" text,
      "account_name" text,
      "account_number" text,
      "bank_name" text,
      "additional_info" text,
      "is_enabled" boolean DEFAULT true
    );
    
    CREATE INDEX IF NOT EXISTS "payment_settings_method_idx" ON "payment_settings"("method");
    `;
    
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
