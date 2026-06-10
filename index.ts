import { config as dotenv } from "dotenv";

const envFile = process.env.NODE_ENV === "development" ? ".env.development" : ".env";
dotenv({ path: envFile, override: true });

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { serveStatic } from "./server/static";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import { initWebSocket } from "./server/websocket";
import { storage } from "./server/storage";
import { chatStorage } from "./server/replit_integrations/chat";
import { registerAIRoutes, agentStorage, brain } from "./server/ai";
import { registerGauAssistantRoutes } from "./server/gau_assistant";
import { readFileSync } from "fs";
import { startOfTomorrow } from "date-fns";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./server/db";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    log("Starting server initialization...");
    log(`DEBUG: Using env file: ${envFile}`);
    log(`DEBUG: DATABASE_URL: ${process.env.DATABASE_URL?.replace(/\/\/.*:.*@/, "//***:***@")}`);
    log(`DEBUG: NODE_ENV: ${process.env.NODE_ENV}`);

    const port = parseInt(process.env.PORT || "5000", 10);
    const useHttps = process.env.USE_HTTPS === "true";
    
    let mainServer: import("http").Server | import("https").Server;
    
    if (useHttps) {
      const httpsServer = createHttpsServer({
        key: readFileSync("./certs/localhost+2-key.pem"),
        cert: readFileSync("./certs/localhost+2.pem"),
      }, app);
      mainServer = httpsServer;
    } else {
      mainServer = httpServer;
    }

    initWebSocket(mainServer);
    log("[WS] WebSocket initialized");

    await registerRoutes(mainServer, app);
    log("[ROUTES] API routes registered");

    registerAIRoutes(app, agentStorage, chatStorage, brain);
    log("[SÓI AI] Agent routes registered");

    registerGauAssistantRoutes(app);
    log("[GAU] Gau Assistant routes registered");

    // Run PostgreSQL migrations if applicable
    const connectionString = process.env.DATABASE_URL;
    const isPostgres = connectionString?.startsWith("postgres://") || connectionString?.startsWith("postgresql://");
    if (isPostgres) {
      log("[DATABASE] Detecting PostgreSQL database. Running migrations...");
      try {
        const dbInstance = getDb();
        await migrate(dbInstance, { migrationsFolder: "./migrations-pg" });
        log("[DATABASE] PostgreSQL migrations completed successfully.");
      } catch (err) {
        console.error("[DATABASE] PostgreSQL migrations failed:", err);
        throw err;
      }
    }

    await storage.runMigrations();
    log("[STORAGE] Migrations finished");

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./server/vite");
      await setupVite(mainServer, app);
    }

    if (useHttps) {
      (mainServer as import("https").Server).listen(port, "0.0.0.0", () => {
        log(`HTTPS Server is listening on port ${port} (0.0.0.0)`);
      });
    } else {
      (mainServer as import("http").Server).listen(port, "0.0.0.0", () => {
        log(`Server is listening on port ${port} (0.0.0.0)`);
      });
    }
  } catch (error: any) {
    console.error("FATAL ERROR DURING STARTUP:", error);
    process.exit(1);
  }
})();
