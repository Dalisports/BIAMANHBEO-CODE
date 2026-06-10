import Database from "better-sqlite3";

const sqlitePath = "./biamanhbeo.sqlite";

function createTables() {
  console.log("Creating missing tables in SQLite...");
  const sqlite = new Database(sqlitePath);

  const statements = [
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS shortcuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL UNIQUE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger TEXT NOT NULL,
      instruction TEXT NOT NULL,
      example TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      key_info TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`
  ];

  for (const stmt of statements) {
    try {
      sqlite.prepare(stmt).run();
      console.log(`Executed statement successfully.`);
    } catch (err: any) {
      console.error("Error executing statement:", err.message);
    }
  }

  sqlite.close();
  console.log("Missing tables creation completed!");
}

createTables();
