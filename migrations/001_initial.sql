-- Migration for Fly Postgres

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  image TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_sticky BOOLEAN DEFAULT false,
  is_priority BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  table_number TEXT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  payment_method TEXT,
  items JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- kitchen_orders
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  table_number TEXT NOT NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Waiting',
  priority TEXT DEFAULT 'normal',
  sent_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT
);

-- payment_settings
CREATE TABLE IF NOT EXISTS payment_settings (
  id SERIAL PRIMARY KEY,
  method TEXT NOT NULL UNIQUE,
  label TEXT,
  icon TEXT,
  qr_image_url TEXT,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  additional_info TEXT,
  is_enabled BOOLEAN DEFAULT true
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  full_name TEXT,
  date_of_birth TEXT,
  hometown TEXT,
  id_card_number TEXT,
  phone_number TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- daily_qr_codes
CREATE TABLE IF NOT EXISTS daily_qr_codes (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW()
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  total_hours INTEGER,
  status TEXT NOT NULL DEFAULT 'checked_in',
  created_at TIMESTAMP DEFAULT NOW()
);