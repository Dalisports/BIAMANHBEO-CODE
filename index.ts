import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { registerGauAssistantRoutes } from "./server/gau_assistant";
import { serveStatic } from "./server/static";
import { createServer } from "http";
import { initWebSocket } from "./server/websocket";
import { storage } from "./server/storage";
import { startOfTomorrow } from "date-fns";

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
    
    initWebSocket(httpServer);
    log("[WS] WebSocket initialized");

    await registerRoutes(httpServer, app);
    log("[ROUTES] API routes registered");

    registerGauAssistantRoutes(app);
    log("[GAU] Gau Assistant routes registered");

    await storage.runMigrations();
    log("[STORAGE] Migrations finished");

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./server/vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(port, "0.0.0.0", () => {
      log(`Server is listening on port ${port}`);
    });
  } catch (error: any) {
    console.error("FATAL ERROR DURING STARTUP:", error);
    process.exit(1);
  }
})();
