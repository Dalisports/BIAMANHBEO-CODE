import { Client } from 'pg';

const DATABASE_URL = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const SQL = `
-- Create original tables if not exist
CREATE TABLE IF NOT EXISTS "menu_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "price" integer NOT NULL,
  "category_id" integer,
  "description" text,
  "image" text,
  "is_available" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "table_number" text NOT NULL,
  "customer_name" text,
  "phone" text,
  "total_amount" integer NOT NULL,
  "status" text DEFAULT 'Pending' NOT NULL,
  "payment_status" text DEFAULT 'Unpaid' NOT NULL,
  "payment_method" text,
  "items" jsonb NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "completed_at" timestamp,
  "paid_at" timestamp
);

CREATE TABLE IF NOT EXISTS "kitchen_orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "table_number" text NOT NULL,
  "items" jsonb NOT NULL,
  "status" text DEFAULT 'Pending' NOT NULL,
  "priority" integer DEFAULT 0,
  "sent_at" timestamp DEFAULT now(),
  "started_at" timestamp,
  "completed_at" timestamp,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "display_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Create new tables
CREATE TABLE IF NOT EXISTS "attendance_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "date" text NOT NULL,
  "qr_code" text NOT NULL,
  "check_in" timestamp,
  "check_out" timestamp,
  "total_hours" integer,
  "status" text DEFAULT 'checked_in' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text DEFAULT 'New Chat' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_qr_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" text NOT NULL,
  "qr_code" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "daily_qr_codes_date_unique" UNIQUE ("date")
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "method" text NOT NULL,
  "label" text,
  "icon" text,
  "qr_image_url" text,
  "account_name" text,
  "account_number" text,
  "bank_name" text,
  "additional_info" text,
  "is_enabled" boolean DEFAULT true,
  CONSTRAINT "payment_settings_method_unique" UNIQUE ("method")
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "value" text,
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "settings_key_unique" UNIQUE ("key")
);

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "full_name" text,
  "date_of_birth" text,
  "hometown" text,
  "id_card_number" text,
  "phone_number" text,
  "is_locked" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "user_profiles_user_id_unique" UNIQUE ("user_id")
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password" text NOT NULL,
  "role" text DEFAULT 'employee' NOT NULL,
  "full_name" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "users_username_unique" UNIQUE ("username")
);

-- Add missing columns to menu_items
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "is_sticky" boolean DEFAULT false;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "is_priority" boolean DEFAULT false;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false;

-- Add foreign key constraints if not exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_conversation_id_fk') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fk" 
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
`;

async function applyMigration() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to Neon database');
    
    const statements = SQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await client.query(stmt);
          console.log(`Executed: ${stmt.substring(0, 50)}...`);
        } catch (err) {
          console.log(`Skipped (maybe exists): ${stmt.substring(0, 50)}... - ${err.message}`);
        }
      }
    }
    
    console.log('Migration completed!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

applyMigration();
