import Database from "better-sqlite3";

const db = new Database("./biamanhbeo.sqlite");

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name: string}[];

console.log("Tables in local SQLite:");
tables.forEach(t => console.log("  -", t.name));

const rowCounts = tables.map(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get() as {c: number};
  return { name: t.name, count: count.c };
});

console.log("\nRow counts:");
rowCounts.forEach(r => console.log(`  ${r.name}: ${r.count} rows`));

db.close();