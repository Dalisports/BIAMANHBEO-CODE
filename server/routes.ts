import type { Express } from "express";
import type { Server } from "http";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { broadcastEvent } from "./websocket";
import { login, register, verifyAuth, requireAuth, requireOwner } from "./auth";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

let _nvidiaAI: OpenAI | null = null;
function getNvidiaAI(): OpenAI {
  if (!_nvidiaAI) {
    _nvidiaAI = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || "",
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return _nvidiaAI;
}

let _googleAI: GoogleGenAI | null = null;
function getGoogleAI(): GoogleGenAI {
  if (!_googleAI) {
    _googleAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY || "" });
  }
  return _googleAI;
}

const GEMMA_MODEL = "gemini-2.0-flash";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // WebSocket health check endpoint
  app.get("/api/ws-status", (req, res) => {
    res.json({
      status: "ok",
      websocket: {
        path: "/ws",
        protocol: req.headers["x-forwarded-proto"] || req.protocol,
      },
      timestamp: Date.now(),
    });
  });

  function getAuthUser(req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;
    return verifyAuth(authHeader.slice(7));
  }

  function requireAuthMiddleware(req: any, res: any, next: any) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  }

  function requireOwnerMiddleware(req: any, res: any, next: any) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "owner") return res.status(403).json({ message: "Forbidden: Owner only" });
    req.user = user;
    next();
  }

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
      }
      const result = await login(username, password);
      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json(result);
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const { username, password, fullName } = req.body;
      console.log("[ROUTES] Register request:", username);

      if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
      }

      const existingUsers = await storage.getUsers();
      const role = existingUsers.length === 0 ? "owner" : "employee";
      console.log("[ROUTES] Existing users:", existingUsers.length, "-> role:", role);

      const result = await register(username, password, role, fullName);
      if (!result) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(201).json(result);
    } catch (err) {
      console.error("[ROUTES] Register error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.auth.me.path, requireAuthMiddleware, async (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/auth/profile", requireAuthMiddleware, async (req: any, res) => {
    try {
      const profile = await storage.getUserProfile(req.user.userId);
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Error fetching profile" });
    }
  });

  app.post("/api/auth/profile", requireAuthMiddleware, async (req: any, res) => {
    try {
      const { fullName, dateOfBirth, hometown, idCardNumber, phoneNumber, lock } = req.body;
      const userId = req.user.userId;

      const existing = await storage.getUserProfile(userId);
      if (existing?.isLocked) {
        return res.status(403).json({ message: "Profile is locked. Contact owner to edit." });
      }

      const profile = await storage.createOrUpdateUserProfile({
        userId,
        fullName: fullName || null,
        dateOfBirth: dateOfBirth || null,
        hometown: hometown || null,
        idCardNumber: idCardNumber || null,
        phoneNumber: phoneNumber || null,
      });

      if (lock) {
        await storage.lockUserProfile(userId);
        profile.isLocked = true;
      }

      res.json(profile);
    } catch (err) {
      console.error("Profile error:", err);
      res.status(500).json({ message: "Error saving profile" });
    }
  });

  app.post("/api/auth/profile/lock/:userId", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const targetUserId = Number(req.params.userId);
      await storage.lockUserProfile(targetUserId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Error locking profile" });
    }
  });

  app.get("/api/auth/profiles", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const allUsers = await storage.getUsers();
      const profiles = await Promise.all(
        allUsers.map(async (user) => {
          const profile = await storage.getUserProfile(user.id);
          return { user, profile };
        })
      );
      res.json(profiles);
    } catch (err) {
      res.status(500).json({ message: "Error fetching profiles" });
    }
  });

  // User management routes (admin/owner only)
  app.get("/api/users", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const allUsersFromDb = await storage.getUsers();
      res.json(allUsersFromDb);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.put("/api/users/:id", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const userId = Number(req.params.id);
      const { role, fullName, isActive } = req.body;
      const updated = await storage.updateUser(userId, { role, fullName, isActive });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete("/api/users/:id", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const userId = Number(req.params.id);
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  app.get("/api/attendance/qr", requireAuthMiddleware, async (req, res) => {
    try {
      const qr = await storage.getTodayQRCode();
      const enabled = await storage.getQrEnabled();
      res.json({ ...qr, enabled });
    } catch (err) {
      res.status(500).json({ message: "Error getting QR code" });
    }
  });

  app.post("/api/attendance/qr/regenerate", requireOwnerMiddleware, async (req, res) => {
    try {
      const qr = await storage.regenerateDailyQRCode();
      const enabled = await storage.getQrEnabled();
      res.json({ ...qr, enabled });
    } catch (err) {
      res.status(500).json({ message: "Error regenerating QR code" });
    }
  });

  app.post("/api/attendance/qr/enabled", requireOwnerMiddleware, async (req, res) => {
    try {
      const { enabled } = req.body;
      await storage.setQrEnabled(!!enabled);
      broadcastEvent("ATTENDANCE_QR_CHANGED", { enabled: !!enabled });
      res.json({ enabled: !!enabled });
    } catch (err) {
      res.status(500).json({ message: "Error toggling QR" });
    }
  });

  app.post("/api/attendance/checkin", requireAuthMiddleware, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      const result = await storage.checkIn(req.user.userId, qrCode);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Error checking in" });
    }
  });

  app.post("/api/attendance/checkout", requireAuthMiddleware, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      const result = await storage.checkOut(req.user.userId, qrCode);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Error checking out" });
    }
  });

  app.get("/api/attendance/my", requireAuthMiddleware, async (req: any, res) => {
    try {
      const records = await storage.getAttendanceByUser(req.user.userId);
      res.json(records);
    } catch (err) {
      res.status(500).json({ message: "Error fetching attendance" });
    }
  });

  app.get("/api/attendance/all", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const records = await storage.getAllAttendance();
      const users = await storage.getUsers();
      const profiles = await storage.getAllUserProfiles();
      const hourlyRate = await storage.getHourlyRate();

      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

      const result = records.map(r => ({
        ...r,
        username: userMap[r.userId]?.username,
        fullName: profileMap[r.userId]?.fullName || userMap[r.userId]?.fullName,
      }));

      const usersWithProfile = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        fullName: profileMap[u.id]?.fullName || u.fullName || u.username,
        phoneNumber: profileMap[u.id]?.phoneNumber || null,
      }));

      res.json({ records: result, hourlyRate, users: usersWithProfile });
    } catch (err) {
      res.status(500).json({ message: "Error fetching attendance" });
    }
  });

  app.get("/api/attendance/rate", requireAuthMiddleware, async (req: any, res) => {
    try {
      const rate = await storage.getHourlyRate();
      res.json({ hourlyRate: rate });
    } catch (err) {
      res.status(500).json({ message: "Error getting hourly rate" });
    }
  });

  app.post("/api/attendance/rate", requireOwnerMiddleware, async (req: any, res) => {
    try {
      const { hourlyRate } = req.body;
      await storage.setHourlyRate(hourlyRate);
      res.json({ success: true, hourlyRate });
    } catch (err) {
      res.status(500).json({ message: "Error setting hourly rate" });
    }
  });

  app.get(api.products.list.path, requireAuthMiddleware, async (req, res) => {
    const prods = await storage.getMenuItems();
    // Sắp xếp: Món ghim (isSticky) lên đầu, sau đó đến món ưu tiên (isPriority), 
    // cuối cùng sắp xếp theo tên ABC.
    const sorted = [...(prods || [])].sort((a: any, b: any) => {
      // 1. Kiểm tra isSticky
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      
      // 2. Kiểm tra isPriority (nếu cả hai cùng sticky hoặc cùng không sticky)
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      
      // 3. Sắp xếp theo tên
      return a.name.localeCompare(b.name, 'vi');
    });
    res.json(sorted);
  });

  app.get("/api/products/:id", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const item = await storage.getMenuItem(id);
      if (!item) return res.status(404).json({ message: "Product not found" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post(api.products.create.path, requireOwnerMiddleware, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const prod = await storage.createMenuItem(input);
      res.status(201).json(prod);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch("/api/products/:id", requireOwnerMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, price, categoryId, description, image, isAvailable, isSticky, isPriority, isHidden } = req.body;
      const updated = await storage.updateMenuItem(id, { name, price, categoryId, description, image, isAvailable, isSticky, isPriority, isHidden });
      res.json(updated);
    } catch (err) {
      console.error("Update product error:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.post("/api/migrate/add-sticky-column", requireOwnerMiddleware, async (req, res) => {
    try {
      await storage.addIsStickyColumn();
      res.json({ success: true, message: "Column added" });
    } catch (err) {
      console.error("Migration error:", err);
      res.status(500).json({ message: "Migration failed" });
    }
  });

  app.post("/api/migrate/add-priority-column", requireOwnerMiddleware, async (req, res) => {
    try {
      await storage.addIsPriorityColumn();
      res.json({ success: true, message: "is_priority column added" });
    } catch (err) {
      console.error("Migration error:", err);
      res.status(500).json({ message: "Migration failed" });
    }
  });

  app.post("/api/migrate/add-hidden-column", requireOwnerMiddleware, async (req, res) => {
    try {
      await db.execute(sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`);
      res.json({ success: true, message: "Column is_hidden added" });
    } catch (err: any) {
      if (err.message?.includes("already exists") || err.code === "42701") {
        res.json({ success: true, message: "Column already exists" });
      } else {
        res.status(500).json({ message: "Migration failed", error: err.message });
      }
    }
  });

  app.delete("/api/products/:id", requireOwnerMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteMenuItem(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get(api.orders.list.path, requireAuthMiddleware, async (req, res) => {
    const { tableNumber, status } = req.query;
    let ords = await storage.getOrders();

    if (tableNumber) {
      ords = ords.filter(o => o.tableNumber === tableNumber);
    }
    if (status) {
      ords = ords.filter(o => o.status === status);
    }

    res.json(ords);
  });

  app.get(api.orders.get.path, requireAuthMiddleware, async (req, res) => {
    const ord = await storage.getOrder(Number(req.params.id));
    if (!ord) return res.status(404).json({ message: "Not found" });
    res.json(ord);
  });

  app.post(api.orders.create.path, requireAuthMiddleware, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const tableNum = input.tableNumber;
      const customerName = tableNum === "1" ? "Ban" : `Ban ${tableNum}`;
      const result = await storage.createOrder({
        ...input,
        customerName: input.customerName || customerName,
      });

      if ('merged' in result) {
        broadcastEvent("ORDER_UPDATED", result.order);
        res.status(200).json({ ...result.order, merged: true });
      } else {
        broadcastEvent("ORDER_CREATED", result);
        res.status(201).json(result);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.orders.update.path, requireAuthMiddleware, async (req, res) => {
    try {
      const input = api.orders.update.input.parse(req.body);
      const ord = await storage.updateOrder(Number(req.params.id), input);
      broadcastEvent("ORDER_UPDATED", ord);
      res.json(ord);
    } catch (err) {
      res.status(400).json({ message: "Error updating" });
    }
  });

  app.post(api.orders.complete.path, requireAuthMiddleware, async (req, res) => {
    try {
      const { ids } = api.orders.complete.input.parse(req.body);
      await storage.completeOrders(ids);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing" });
    }
  });

  app.post("/api/orders/uncomplete/:id", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.uncompleteOrder(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error uncompleting" });
    }
  });

  app.post("/api/admin/seed-menu", requireOwnerMiddleware, async (req, res) => {
    try {
      const seedItems = [
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
      const created = [];
      for (const item of seedItems) {
        const created_item = await storage.createMenuItem({
          name: item.name,
          price: item.price,
          isAvailable: true,
          isActive: true,
        });
        created.push(created_item);
      }
      res.json({ success: true, count: created.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Seed failed" });
    }
  });

  app.post("/api/orders/:id/unpay", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.unpayOrder(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error unpaying" });
    }
  });

  app.delete("/api/orders/:id", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteOrder(id);
      broadcastEvent("ORDER_DELETED", { id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  app.get("/api/payment-settings", requireAuthMiddleware, async (req, res) => {
    const settings = await storage.getPaymentSettings();
    res.json(settings);
  });

  app.patch("/api/payment-settings/:method", requireOwnerMiddleware, async (req, res) => {
    try {
      const method = req.params.method;
      const { label, icon, qrImageUrl, accountName, accountNumber, bankName, additionalInfo, isEnabled } = req.body;
      const updated = await storage.updatePaymentSetting(method, {
        label, icon, qrImageUrl, accountName, accountNumber, bankName, additionalInfo,
        ...(isEnabled !== undefined ? { isEnabled } : {})
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update payment setting" });
    }
  });

  app.post("/api/orders/:id/pay", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { method } = req.body;
      await storage.payOrder(id, method);
      const paidOrder = await storage.getOrder(id); // get fresh order
      broadcastEvent("KITCHEN_ORDER_DELETED", { orderId: id });
      broadcastEvent("ORDER_UPDATED", { ...paidOrder });
      res.json(paidOrder);
    } catch (err) {
      res.status(400).json({ message: "Error paying" });
    }
  });

  app.post("/api/orders/:id/send-to-kitchen", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const kitchenOrder = await storage.sendToKitchen(id);
      broadcastEvent("KITCHEN_ORDER_CREATED", kitchenOrder);
      res.status(201).json(kitchenOrder);
    } catch (err) {
      res.status(400).json({ message: "Error sending to kitchen" });
    }
  });

  app.post("/api/orders/:id/move", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { tableNumber } = req.body;
      if (!tableNumber) {
        return res.status(400).json({ message: "Missing table number" });
      }
      const updated = await storage.updateOrder(id, { tableNumber });
      broadcastEvent("ORDER_UPDATED", updated);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Error moving order" });
    }
  });

  app.get("/api/kitchen", requireAuthMiddleware, async (req, res) => {
    const kitchenOrders = await storage.getKitchenOrders();
    res.json(kitchenOrders);
  });

  app.post("/api/kitchen/:id/start", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.startKitchenOrder(id);
      const order = await storage.getKitchenOrder(id);
      broadcastEvent("KITCHEN_ORDER_UPDATED", order);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error starting" });
    }
  });

  app.post("/api/kitchen/:id/complete", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.completeKitchenOrder(id);
      const order = await storage.getKitchenOrder(id);
      broadcastEvent("KITCHEN_ORDER_UPDATED", order);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing" });
    }
  });

  app.post("/api/kitchen/:id/start-item", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { itemName, notes } = req.body;
      await storage.startKitchenItem(id, itemName, notes);
      const order = await storage.getKitchenOrder(id);
      broadcastEvent("KITCHEN_ORDER_UPDATED", order);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error starting item" });
    }
  });

  app.post("/api/kitchen/:id/complete-item", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { itemName, notes } = req.body;
      await storage.completeKitchenItem(id, itemName, notes);
      const order = await storage.getKitchenOrder(id);
      broadcastEvent("KITCHEN_ORDER_UPDATED", order);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing item" });
    }
  });

  app.post("/api/kitchen/:id/remove-item", requireAuthMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { itemName, notes } = req.body;
      await storage.removeKitchenItem(id, itemName, notes);
      broadcastEvent("KITCHEN_ORDER_UPDATED", { id });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error removing item" });
    }
  });

  app.post("/api/kitchen/clear-completed", requireAuthMiddleware, async (req, res) => {
    try {
      console.log("[CLEAR] Starting to clear old completed kitchen orders...");
      const deletedCount = await storage.clearOldCompletedKitchenOrders();
      console.log(`[CLEAR] Deleted ${deletedCount} orders`);
      res.json({ success: true, deletedCount });
    } catch (err) {
      console.error("[CLEAR] Error:", err);
      res.status(500).json({ message: "Error clearing completed orders" });
    }
  });

  app.get("/api/kitchen/order", requireAuthMiddleware, async (req, res) => {
    try {
      const setting = await storage.getSetting("kitchen_item_order");
      let order: string[] | null = null;
      if (setting?.value) {
        try {
          const parsed = JSON.parse(setting.value);
          order = Array.isArray(parsed) ? parsed : null;
        } catch {
          order = null;
        }
      }
      res.json({ order });
    } catch (err) {
      res.status(500).json({ message: "Error getting kitchen order" });
    }
  });

  app.post("/api/kitchen/order", requireAuthMiddleware, async (req, res) => {
    try {
      const { order } = req.body;
      if (order !== null && order !== undefined) {
        if (!Array.isArray(order)) {
          return res.status(400).json({ message: "order must be an array or null" });
        }
        if (order.length > 500) {
          return res.status(400).json({ message: "order array too large" });
        }
        if (order.some((k: unknown) => typeof k !== "string")) {
          return res.status(400).json({ message: "order items must be strings" });
        }
      }
      await storage.setSetting("kitchen_item_order", order && order.length > 0 ? JSON.stringify(order) : "");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Error saving kitchen order" });
    }
  });

  app.get("/api/categories", requireAuthMiddleware, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/settings/:key", requireAuthMiddleware, async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSetting(key);
      res.json(setting || { key, value: null });
    } catch (err) {
      res.status(500).json({ message: "Error getting setting" });
    }
  });

  app.patch("/api/settings/:key", requireOwnerMiddleware, async (req, res) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      if (value === undefined) {
        return res.status(400).json({ message: "Missing value" });
      }
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (err) {
      res.status(500).json({ message: "Error saving setting" });
    }
  });

  app.post("/api/settings", requireOwnerMiddleware, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ message: "Missing key" });
      }
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (err) {
      res.status(500).json({ message: "Error saving setting" });
    }
  });

  // Shortcuts feature removed per user request

  app.post("/api/ticker", requireOwnerMiddleware, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Missing text" });
      }
      await storage.setSetting("tickerText", text);
      res.json({ success: true, text });
    } catch (err) {
      res.status(500).json({ message: "Error updating ticker" });
    }
  });

  app.post("/api/categories", requireOwnerMiddleware, async (req, res) => {
    try {
      const { name, displayOrder } = req.body;
      const cat = await storage.createCategory({ name, displayOrder: displayOrder || 0 });
      res.status(201).json(cat);
    } catch (err) {
      res.status(400).json({ message: "Error creating category" });
    }
  });

  app.patch("/api/categories/:id", requireOwnerMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, displayOrder } = req.body;
      const updated = await storage.updateCategory(id, { ...(name !== undefined ? { name } : {}), ...(displayOrder !== undefined ? { displayOrder } : {}) });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireOwnerMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/reports/daily", requireOwnerMiddleware, async (req, res) => {
    try {
      const report = await storage.getDailyReport();
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  app.get("/api/reports/best-sellers", requireOwnerMiddleware, async (req, res) => {
    try {
      const report = await storage.getBestSellers();
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  app.post(api.chat.process.path, requireAuthMiddleware, async (req, res) => {
    try {
      const { message, history, model } = api.chat.process.input.parse(req.body);

      const menuItemsList = await storage.getMenuItems();
      const categoriesList = await storage.getCategories();
      const pendingOrders = await storage.getPendingOrders();
      const activeKitchenOrders = await storage.getActiveKitchenOrders();
      const allOrders = await storage.getOrders();
      const dailyReport = await storage.getDailyReport();

      const nonPendingOrders = allOrders.filter(o => o.status !== "Complete");

      const systemPrompt = `Bạn là AI assistant quản lý NHÀ HÀNG F&B. 
Bạn trò chuyện với nhân viên để:
1. Tạo order cho khách (cần số bàn)
2. Gửi món vào bếp
3. Quản lý menu (món ăn, đồ uống) và danh mục
4. Thanh toán
5. Xem báo cáo
6. Cập nhật ảnh món ăn

Ngữ cảnh hiện tại:
Danh mục: ${JSON.stringify(categoriesList)}
Menu: ${JSON.stringify(menuItemsList)}
Tất cả đơn hàng: ${JSON.stringify(allOrders)}
Order đang chờ xử lý: ${JSON.stringify(pendingOrders)}
Order đang nấu ở bếp: ${JSON.stringify(activeKitchenOrders)}
Đơn hàng cần thanh toán: ${JSON.stringify(nonPendingOrders.filter(o => o.status !== "Complete"))}
Báo cáo hôm nay: Doanh thu ${dailyReport.todayRevenue}đ, ${dailyReport.completedOrders} đơn đã thanh toán

QUAN TRỌNG: Khi nhân viên hỏi về đơn hàng, LUÔN kiểm tra trong "Tất cả đơn hàng" để tìm đơn hàng theo số bàn hoặc tên khách.
Để gửi bếp hoặc thanh toán, cần sử dụng orderId từ danh sách đơn hàng.

Luôn trả lời bằng tiếng Việt.
Tên của bạn: 'SÓI F&B' - Trợ lý Nhà hàng F&B.

Trạng thái đơn hàng:
- Pending = CHƯA XỬ LÝ
- InKitchen = ĐANG NẤU  
- Ready = CHƯA THANH TOÁN (đã hoàn thành nấu, chờ thanh toán)
- Complete = ĐÃ THANH TOÁN

Các hành động có thể thực hiện:
1. CREATE_ORDER: Tạo order mới. Data: { tableNumber, items: [{menuItemId, name, quantity, price}], totalAmount, customerName?, phone?, notes? }
2. ADD_TO_TABLE: Thêm món vào bàn đang có đơn. Data: { tableNumber, items: [{menuItemId, name, quantity, price}], totalAmount }
3. SEND_TO_KITCHEN: Gửi order vào bếp. Data: { orderId }
4. PAY_ORDER: Thanh toán order (mọi trạng thái trừ Complete). Data: { orderId, paymentMethod: "cash" | "transfer" | "vnpay" | "momo" }
5. CREATE_MENU_ITEM: Thêm món mới vào menu. Data: { name, price, description?, categoryId? }
6. UPDATE_MENU_ITEM: Sửa món ăn (tên, giá, mô tả, danh mục). Data: { menuItemId, name?, price?, description?, categoryId? }
7. DELETE_MENU_ITEM: Xóa món ăn. Data: { menuItemId }
8. UPDATE_MENU_ITEM_IMAGE: Cập nhật ảnh cho món ăn. Data: { menuItemId, imageUrl }
9. CREATE_CATEGORY: Thêm danh mục mới. Data: { name, displayOrder? }
10. UPDATE_CATEGORY: Sửa tên danh mục. Data: { categoryId, name }
11. DELETE_CATEGORY: Xóa danh mục. Data: { categoryId }
12. UNPAY_ORDER: Hoàn tác thanh toán (đưa về chưa thanh toán). Data: { orderId }
13. DELETE_ORDER: Xóa đơn hàng. Data: { orderId }
14. QUERY: Hỏi thông tin. Không cần data.
15. NONE: Chỉ trò chuyện, không hành động.

LUÔN ưu tiên ADD_TO_TABLE khi khách muốn thêm món vào bàn đang có đơn (status != Complete).

Trả về JSON:
{
  "reply": "Tin nhắn trả lời cho nhân viên",
  "action": "Hành động hoặc NONE",
  "data": { ... }
}

Ví dụ:
- "Order bàn 5: 2 phần gà rán, 1 cocacola" -> CREATE_ORDER với tableNumber="5"
- "Gửi bếp bàn 5" -> SEND_TO_KITCHEN
- "Thanh toán bàn 3" -> PAY_ORDER
- "Xem doanh thu hôm nay" -> QUERY với reply chứa thông tin dailyReport
- "Thêm món trà sữa trân châu giá 35k" -> CREATE_MENU_ITEM
- "Đổi tên danh mục 2 thành Đồ uống" -> UPDATE_CATEGORY với categoryId=2
- "Thêm danh mục Tráng miệng" -> CREATE_CATEGORY
- "Xóa danh mục Tráng miệng" -> DELETE_CATEGORY
- "Cập nhật ảnh món Đầu lợn bằng link https://..." -> UPDATE_MENU_ITEM_IMAGE
- "Sửa giá món Cốc bia thành 8000" -> UPDATE_MENU_ITEM

Giá tiền mặc định là VND. Khách hỏi giá thì đọc giá từ menu.`;

      const recentHistory = (history || []).slice(-20);
      const historyMessages = recentHistory.map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      }));

      let parsedResponse: any;

      // Model selection: google, openrouter, or nvidia (minimax)
      const isGoogleModel = model === "gemma";
      const isNvidiaModel = model === "minimax" || model === "minimaxai/minimax-m2.7";

      if (isGoogleModel) {
        // Use Google AI directly
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...historyMessages.map(h => ({
            role: h.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: h.content }]
          })),
          { role: "user", parts: [{ text: message }] }
        ];

        const response = await getGoogleAI().models.generateContent({
          model: GEMMA_MODEL,
          contents,
          config: {
            responseMimeType: "application/json",
          }
        });

        const content = response.text;
        if (!content) {
          throw new Error("No response from AI");
        }

        parsedResponse = JSON.parse(content);
      } else if (isNvidiaModel) {
        // Use NVIDIA API with Minimax model
        const response = await getNvidiaAI().chat.completions.create({
          model: "minimaxai/minimax-m2.7",
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: message }
          ],
          response_format: { type: "json_object" },
          temperature: 1,
          top_p: 0.95,
          max_tokens: 8192,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from AI");
        }

        parsedResponse = JSON.parse(content);
      } else {
        // Use free models from OpenRouter
        const freeModel = "meta-llama/llama-3.2-3b-instruct:free";

        const response = await getOpenAI().chat.completions.create({
          model: freeModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: message }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1024
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from AI");
        }

        parsedResponse = JSON.parse(content);
      }

      if (parsedResponse.action === 'CREATE_ORDER' && parsedResponse.data?.tableNumber && parsedResponse.data?.items?.length > 0) {
        const tableNum = parsedResponse.data.tableNumber;
        const customerName = tableNum === "1" ? "Ban" : `Ban ${tableNum}`;

        const result = await storage.createOrder({
          tableNumber: tableNum,
          customerName: parsedResponse.data.customerName || customerName,
          phone: parsedResponse.data.phone || null,
          totalAmount: parsedResponse.data.totalAmount || 0,
          items: parsedResponse.data.items,
          status: "Pending",
          paymentStatus: "Unpaid",
          notes: parsedResponse.data.notes || null,
        });

        if ('merged' in result) {
          broadcastEvent("ORDER_UPDATED", result.order);
        } else {
          broadcastEvent("ORDER_CREATED", result);
        }
      } else if (parsedResponse.action === 'ADD_TO_TABLE' && parsedResponse.data?.tableNumber && parsedResponse.data?.items?.length > 0) {
        const tableNum = parsedResponse.data.tableNumber;
        const pendingOrder = await storage.getActiveOrderByTable(tableNum);

        if (pendingOrder) {
          const existingItems = pendingOrder.items as any[];
          const newItems = parsedResponse.data.items as any[];

          for (const newItem of newItems) {
            const existingIndex = existingItems.findIndex(
              i => i.menuItemId === newItem.menuItemId
            );
            if (existingIndex >= 0) {
              existingItems[existingIndex] = {
                ...existingItems[existingIndex],
                quantity: existingItems[existingIndex].quantity + newItem.quantity
              };
            } else {
              existingItems.push(newItem);
            }
          }

          const newTotal = existingItems.reduce((sum, item: any) => sum + item.price * item.quantity, 0);
          await storage.updateOrder(pendingOrder.id, { items: existingItems, totalAmount: newTotal });
          broadcastEvent("ORDER_UPDATED", { ...pendingOrder, items: existingItems, totalAmount: newTotal });
        }
      } else if (parsedResponse.action === 'SEND_TO_KITCHEN' && parsedResponse.data?.orderId) {
        await storage.sendToKitchen(parsedResponse.data.orderId);
      } else if (parsedResponse.action === 'PAY_ORDER' && parsedResponse.data?.orderId) {
        await storage.payOrder(parsedResponse.data.orderId, parsedResponse.data.paymentMethod || "cash");
      } else if (parsedResponse.action === 'CREATE_MENU_ITEM' && parsedResponse.data?.name && parsedResponse.data?.price) {
        await storage.createMenuItem({
          name: parsedResponse.data.name,
          price: Number(parsedResponse.data.price),
          description: parsedResponse.data.description || null,
          categoryId: parsedResponse.data.categoryId || null,
          isAvailable: true,
          isActive: true,
        });
      } else if (parsedResponse.action === 'UPDATE_MENU_ITEM' && parsedResponse.data?.menuItemId) {
        const { menuItemId, name, price, description, categoryId } = parsedResponse.data;
        await storage.updateMenuItem(menuItemId, {
          ...(name !== undefined ? { name } : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
        });
      } else if (parsedResponse.action === 'DELETE_MENU_ITEM' && parsedResponse.data?.menuItemId) {
        await storage.deleteMenuItem(parsedResponse.data.menuItemId);
      } else if (parsedResponse.action === 'UPDATE_MENU_ITEM_IMAGE' && parsedResponse.data?.menuItemId && parsedResponse.data?.imageUrl) {
        await storage.updateMenuItem(parsedResponse.data.menuItemId, { image: parsedResponse.data.imageUrl });
      } else if (parsedResponse.action === 'CREATE_CATEGORY' && parsedResponse.data?.name) {
        await storage.createCategory({
          name: parsedResponse.data.name,
          displayOrder: parsedResponse.data.displayOrder || 0,
        });
      } else if (parsedResponse.action === 'UPDATE_CATEGORY' && parsedResponse.data?.categoryId && parsedResponse.data?.name) {
        await storage.updateCategory(parsedResponse.data.categoryId, { name: parsedResponse.data.name });
      } else if (parsedResponse.action === 'DELETE_CATEGORY' && parsedResponse.data?.categoryId) {
        await storage.deleteCategory(parsedResponse.data.categoryId);
      } else if (parsedResponse.action === 'UNPAY_ORDER' && parsedResponse.data?.orderId) {
        await storage.unpayOrder(parsedResponse.data.orderId);
      } else if (parsedResponse.action === 'DELETE_ORDER' && parsedResponse.data?.orderId) {
        await storage.deleteOrder(parsedResponse.data.orderId);
        broadcastEvent("ORDER_DELETED", { id: parsedResponse.data.orderId });
      }

      res.json(parsedResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // vMix API Proxy - Route để xử lý vMix commands từ client
  app.post("/api/vmix/command", requireAuthMiddleware, async (req, res) => {
    try {
      const { Function: vmixCommand, ...params } = req.body;

      if (!vmixCommand) {
        return res.status(400).json({ message: "Missing Function parameter" });
      }

      // Build query string for vMix
      const queryParams = new URLSearchParams();
      queryParams.append("Function", vmixCommand);

      // Add all other parameters
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, String(value));
      }

      // Get vMix API config from environment or use defaults
      const vmixHost = process.env.VMIX_HOST || "localhost";
      const vmixPort = process.env.VMIX_PORT || "8088";
      const vmixUrl = `http://${vmixHost}:${vmixPort}/API/?${queryParams.toString()}`;

      console.log("[vMix] Sending command:", vmixUrl);

      const response = await fetch(vmixUrl, { signal: AbortSignal.timeout(5000) });
      const text = await response.text();

      res.setHeader("Content-Type", "text/xml");
      res.send(text);
    } catch (err) {
      console.error("[vMix] Error:", err);
      res.status(502).json({ message: "vMix API error", error: String(err) });
    }
  });

  // vMix health check endpoint
  app.get("/api/vmix/status", requireAuthMiddleware, async (req, res) => {
    try {
      const vmixHost = process.env.VMIX_HOST || "localhost";
      const vmixPort = process.env.VMIX_PORT || "8088";
      const vmixUrl = `http://${vmixHost}:${vmixPort}/API/?Function=GetStatus`;

      console.log("[vMix Health Check] Checking:", vmixUrl);

      const response = await fetch(vmixUrl, { signal: AbortSignal.timeout(3000) });
      const text = await response.text();

      if (!response.ok) {
        return res.status(502).json({
          connected: false,
          error: `HTTP ${response.status}`,
          host: vmixHost,
          port: vmixPort,
        });
      }

      // Check if response looks like vMix XML
      if (text.includes("<vmix>")) {
        return res.json({
          connected: true,
          host: vmixHost,
          port: vmixPort,
          responsePreview: text.substring(0, 200),
        });
      } else {
        return res.status(502).json({
          connected: false,
          error: "Invalid response format",
          host: vmixHost,
          port: vmixPort,
        });
      }
    } catch (err) {
      console.error("[vMix Health Check] Error:", err);
      res.status(502).json({
        connected: false,
        error: String(err),
        host: process.env.VMIX_HOST || "localhost",
        port: process.env.VMIX_PORT || "8088",
      });
    }
  });

  // vMix Proxy endpoint cho client PHP
  app.get("/api/vmix-proxy", requireAuthMiddleware, async (req, res) => {
    try {
      const vmixCommand = req.query.Function as string;

      if (!vmixCommand) {
        return res.status(400).json({ message: "Missing Function parameter" });
      }

      // Build query string
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        queryParams.append(key, String(value));
      }

      // Send request to local vMix API
      const vmixUrl = `http://localhost:8088/API/?${queryParams.toString()}`;
      console.log("[vMix Proxy] Request:", vmixUrl);

      const response = await fetch(vmixUrl);
      const text = await response.text();

      res.setHeader("Content-Type", "text/xml");
      res.send(text);
    } catch (err) {
      console.error("[vMix Proxy] Error:", err);
      res.status(502).json({ message: "vMix service unavailable", error: String(err) });
    }
  });

  return httpServer;
}
