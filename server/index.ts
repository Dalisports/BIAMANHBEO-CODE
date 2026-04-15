import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initWebSocket } from "./websocket";
import { storage } from "./storage";
import { startOfTomorrow } from "date-fns";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const SEED_MENU_ITEMS = [
  { name: "Đầu lợn", price: 145000 },
  { name: "TIẾT LUỘC", price: 40000 },
  { name: "Đậu tẩm hành", price: 40000 },
  { name: "Đậu chiên giòn", price: 30000 },
  { name: "Lòng xào dưa", price: 30000 },
  { name: "Lòng khìa nước dừa", price: 100000 },
  { name: "Nầm chiên", price: 150000 },
  { name: "Nọng heo chiên", price: 150000 },
  { name: "Sườn rán", price: 145000 },
  { name: "Sườn sốt cay", price: 145000 },
  { name: "Rau xào theo mùa", price: 30000 },
  { name: "Nộm tai", price: 90000 },
  { name: "Đuôi lợn luộc", price: 100000 },
  { name: "Ba chỉ rang giềng", price: 130000 },
  { name: "Cật trần", price: 100000 },
  { name: "Gan xào cay", price: 90000 },
  { name: "Gan cháy tỏi", price: 90000 },
  { name: "Tóp mỡ dưa chua", price: 110000 },
  { name: "Pate xúc phồng tôm", price: 100000 },
  { name: "Má đào chiên hạt dổi", price: 120000 },
  { name: "Cốc bia", price: 6000 },
  { name: "Rượu men lá", price: 35000 },
  { name: "Chai bia Hà Nội", price: 15000 },
  { name: "Chai bia Sài Gòn", price: 19000 },
  { name: "Chai bia Tiger Bạc", price: 200000 },
  { name: "Lạc rang", price: 10000 },
  { name: "Bánh đa", price: 5000 },
  { name: "Mực nướng", price: 160000 },
  { name: "Má đào nướng sa tế", price: 120000 },
  { name: "Mướp đắng xào trứng", price: 60000 },
  { name: "Mướp đắng ruốc", price: 100000 },
  { name: "Cơm rang trứng chảy", price: 50000 },
  { name: "Ca bia", price: 30000 },
  { name: "Dưa chua", price: 10000 },
  { name: "Thăng long", price: 16000 },
  { name: "Sài gòn bạc", price: 20000 },
  { name: "Thùng bia sài gòn", price: 280000 },
  { name: "Mướp xào giá", price: 40000 },
  { name: "Nem chua", price: 40000 },
];

async function seedMenuIfEmpty() {
  try {
    const existing = await storage.getMenuItems();
    const activeCount = existing.filter(i => i.isActive).length;
    if (activeCount === 0) {
      log("[SEED] Menu trống — đang thêm dữ liệu mặc định...");
      for (const item of SEED_MENU_ITEMS) {
        await storage.createMenuItem({ name: item.name, price: item.price, isAvailable: true, isActive: true });
      }
      log(`[SEED] Đã thêm ${SEED_MENU_ITEMS.length} món ăn.`);
    }
  } catch (err) {
    console.error("[SEED] Lỗi seed menu:", err);
  }
}

(async () => {
  await registerRoutes(httpServer, app);
  initWebSocket(httpServer);
  await seedMenuIfEmpty();

  function scheduleMidnightClear() {
    const now = new Date();
    const tomorrow = startOfTomorrow();
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        const deletedCount = await storage.clearOldCompletedKitchenOrders();
        if (deletedCount > 0) {
          log(`[SCHEDULER] Đã xóa ${deletedCount} đơn bếp hoàn thành từ ngày hôm trước`);
        }
      } catch (err) {
        console.error("[SCHEDULER] Lỗi khi xóa đơn bếp hoàn thành:", err);
      }
      
      scheduleMidnightClear();
    }, msUntilMidnight);
  }
  
  scheduleMidnightClear();
  log("[SCHEDULER] Đã lên lịch tự động xóa đơn bếp hoàn thành lúc 00:00 hàng ngày");

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
