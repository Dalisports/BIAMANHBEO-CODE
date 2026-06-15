import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations-pg",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
