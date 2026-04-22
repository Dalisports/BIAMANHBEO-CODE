import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // In a bundled CJS file (dist/index.cjs), __dirname is where the bundle is
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  console.log(`[STATIC] Serving static files from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`[STATIC] Error: Directory not found: ${distPath}`);
    // Don't throw, just log. This prevents the whole app from crashing
    return;
  }

  app.use(express.static(distPath));

  app.use("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
