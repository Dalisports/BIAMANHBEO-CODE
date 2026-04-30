import { db } from "./db";
import {
  menuItems,
  orders,
  categories,
  kitchenOrders,
  paymentSettings,
  settings,
  users,
  userProfiles,
  dailyQRCodes,
  attendanceRecords,
  type InsertMenuItem,
  type InsertOrder,
  type InsertCategory,
  type InsertKitchenOrder,
  type InsertPaymentSetting,
  type Order,
  type KitchenOrder,
  type PaymentSetting,
  type User,
  type UserProfile,
  type InsertUserProfile,
  type DailyQRCode,
  type AttendanceRecord
} from "@shared/schema";
import { eq, inArray, and, desc, lt, ne } from "drizzle-orm";
import { startOfDay, endOfDay, startOfToday } from "date-fns";

export interface IStorage {
  getUsers(): Promise<User[]>;
  createUser(user: { username: string; password: string; role: string; fullName?: string }): Promise<User>;
  getUserProfile(userId: number): Promise<UserProfile | null>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  createOrUpdateUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  lockUserProfile(userId: number): Promise<void>;
  generateDailyQRCode(): Promise<DailyQRCode>;
  getTodayQRCode(): Promise<DailyQRCode | null>;
  checkIn(userId: number, qrCode: string): Promise<AttendanceRecord | null>;
  checkOut(userId: number, qrCode: string): Promise<AttendanceRecord | null>;
  getAttendanceByUser(userId: number): Promise<AttendanceRecord[]>;
  getAllAttendance(): Promise<AttendanceRecord[]>;
  getHourlyRate(): Promise<number>;
  setHourlyRate(rate: number): Promise<void>;
  getCategories(): Promise<typeof categories.$inferSelect[]>;
  createCategory(category: InsertCategory): Promise<typeof categories.$inferSelect>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<typeof categories.$inferSelect>;
  deleteCategory(id: number): Promise<void>;
  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: string): Promise<any>;
  unpayOrder(id: number): Promise<void>;

  getMenuItems(): Promise<typeof menuItems.$inferSelect[]>;
  getMenuItem(id: number): Promise<typeof menuItems.$inferSelect | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<typeof menuItems.$inferSelect>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<typeof menuItems.$inferSelect>;
  deleteMenuItem(id: number): Promise<void>;
  
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getPendingOrders(): Promise<Order[]>;
  getPendingOrderByTable(tableNumber: string): Promise<Order | undefined>;
  getActiveOrderByTable(tableNumber: string): Promise<Order | undefined>;
  getActiveKitchenOrders(): Promise<KitchenOrder[]>;
  createOrder(order: InsertOrder): Promise<Order | { merged: true; order: Order }>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  completeOrders(ids: number[]): Promise<void>;
  uncompleteOrder(id: number): Promise<void>;
  payOrder(id: number, method: string): Promise<void>;
  
  sendToKitchen(orderId: number): Promise<KitchenOrder>;
  getKitchenOrders(): Promise<KitchenOrder[]>;
  startKitchenOrder(id: number): Promise<void>;
  completeKitchenOrder(id: number): Promise<void>;
  startKitchenItem(kitchenOrderId: number, itemName: string, notes?: string): Promise<void>;
  completeKitchenItem(kitchenOrderId: number, itemName: string, notes?: string): Promise<void>;
  
  getDailyReport(): Promise<{ todayRevenue: number; completedOrders: number; pendingOrders: number; kitchenActive: number }>;
  getBestSellers(): Promise<{ name: string; totalQuantity: number }[]>;
  clearOldCompletedKitchenOrders(): Promise<number>;
  addIsStickyColumn(): Promise<void>;
  addIsPriorityColumn(): Promise<void>;
  runMigrations(): Promise<void>;

  getPaymentSettings(): Promise<PaymentSetting[]>;
  updatePaymentSetting(method: string, data: Partial<InsertPaymentSetting>): Promise<PaymentSetting>;
}

export class DatabaseStorage implements IStorage {
  async getUsers() {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async createUser(user: { username: string; password: string; role: string; fullName?: string }) {
    const [created] = await db.insert(users).values({
      username: user.username,
      password: user.password,
      role: user.role,
      fullName: user.fullName || null,
      isActive: true,
    }).returning();
    return created;
  }

  async getAllUserProfiles() {
    return await db.select().from(userProfiles);
  }

  async getUserProfile(userId: number) {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || null;
  }

  async createOrUpdateUserProfile(data: InsertUserProfile) {
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, data.userId));
    
    if (existing.length > 0) {
      const [updated] = await db.update(userProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userProfiles.userId, data.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfiles).values(data).returning();
      return created;
    }
  }

  async lockUserProfile(userId: number) {
    await db.update(userProfiles)
      .set({ isLocked: true, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  }

  async generateDailyQRCode() {
    const today = new Date().toISOString().split("T")[0];
    const qrCode = `ATT-${today}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const existing = await db.select().from(dailyQRCodes).where(eq(dailyQRCodes.date, today));
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(dailyQRCodes).values({ date: today, qrCode }).returning();
    return created;
  }

  async getTodayQRCode() {
    const today = new Date().toISOString().split("T")[0];
    const [code] = await db.select().from(dailyQRCodes).where(eq(dailyQRCodes.date, today));
    if (!code) {
      return this.generateDailyQRCode();
    }
    return code;
  }

  async regenerateDailyQRCode() {
    const today = new Date().toISOString().split("T")[0];
    const qrCode = `ATT-${today}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const existing = await db.select().from(dailyQRCodes).where(eq(dailyQRCodes.date, today));
    if (existing.length > 0) {
      const [updated] = await db.update(dailyQRCodes)
        .set({ qrCode, createdAt: new Date() })
        .where(eq(dailyQRCodes.date, today))
        .returning();
      return updated;
    }
    const [created] = await db.insert(dailyQRCodes).values({ date: today, qrCode }).returning();
    return created;
  }

  async getQrEnabled() {
    const setting = await this.getSetting("attendance_qr_enabled");
    return setting?.value === "true";
  }

  async setQrEnabled(enabled: boolean) {
    await this.setSetting("attendance_qr_enabled", enabled ? "true" : "false");
  }

  async checkIn(userId: number, qrCode: string) {
    const today = new Date().toISOString().split("T")[0];
    const existing = await db.select().from(attendanceRecords).where(
      and(eq(attendanceRecords.userId, userId), eq(attendanceRecords.date, today))
    );
    if (existing.length > 0) {
      return null;
    }
    const [created] = await db.insert(attendanceRecords).values({
      userId,
      date: today,
      qrCode,
      checkIn: new Date(),
      status: "checked_in",
    }).returning();
    return created;
  }

  async checkOut(userId: number, qrCode: string) {
    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db.select().from(attendanceRecords).where(
      and(eq(attendanceRecords.userId, userId), eq(attendanceRecords.date, today), eq(attendanceRecords.status, "checked_in"))
    );
    if (!existing) return null;
    
    const checkInTime = new Date(existing.checkIn!);
    const checkOutTime = new Date();
    const totalMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalHours = Math.round(totalMs / (1000 * 60 * 60) * 100) / 100;
    
    const [updated] = await db.update(attendanceRecords)
      .set({ checkOut: checkOutTime, totalHours: Math.floor(totalHours * 100), status: "checked_out" })
      .where(eq(attendanceRecords.id, existing.id))
      .returning();
    return updated;
  }

  async getAttendanceByUser(userId: number) {
    return await db.select().from(attendanceRecords)
      .where(eq(attendanceRecords.userId, userId))
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.checkIn));
  }

  async getAllAttendance() {
    return await db.select().from(attendanceRecords)
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.checkIn));
  }

  async getHourlyRate() {
    const setting = await this.getSetting("hourly_rate");
    return setting?.value ? parseFloat(setting.value) : 50000;
  }

  async setHourlyRate(rate: number) {
    await this.setSetting("hourly_rate", rate.toString());
  }

  async getCategories() {
    return await db.select().from(categories).orderBy(categories.displayOrder);
  }

  async getSetting(key: string) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string) {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings)
      .values({ key, value })
      .returning();
    return created;
  }

  async createCategory(category: InsertCategory) {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>) {
    const [updated] = await db.update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number) {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getMenuItems() {
    return await db.select().from(menuItems).where(eq(menuItems.isActive, true));
  }

  async getMenuItem(id: number) {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem) {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>) {
    const [updated] = await db.update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

async deleteMenuItem(id: number) {
    await db.update(menuItems)
      .set({ isActive: false })
      .where(eq(menuItems.id, id));
  }

  async getOrders() {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getPendingOrders() {
    return await db.select().from(orders).where(eq(orders.status, "Pending"));
  }

  async getActiveKitchenOrders() {
    return await db.select().from(kitchenOrders).where(
      inArray(kitchenOrders.status, ["Waiting", "Cooking"])
    );
  }

  async createOrder(order: InsertOrder): Promise<Order | { merged: true; order: Order }> {
    const pendingOrder = await this.getPendingOrderByTable(order.tableNumber);
    
    if (pendingOrder) {
      const existingItems = pendingOrder.items as any[];
      const newItems = order.items as any[];
      
      const mergedItems = [...existingItems];
      
      for (const newItem of newItems) {
        const existingIndex = mergedItems.findIndex(
          i => i.menuItemId === newItem.menuItemId && i.notes === newItem.notes
        );
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity: mergedItems[existingIndex].quantity + newItem.quantity
          };
        } else {
          mergedItems.push(newItem);
        }
      }
      
      const newTotal = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      const [updated] = await db.update(orders)
        .set({ 
          items: mergedItems,
          totalAmount: newTotal
        })
        .where(eq(orders.id, pendingOrder.id))
        .returning();
      
      return { merged: true, order: updated };
    }
    
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }
  
  async getPendingOrderByTable(tableNumber: string) {
    const [order] = await db.select().from(orders).where(
      and(
        eq(orders.tableNumber, tableNumber),
        eq(orders.status, "Pending")
      )
    );
    return order;
  }

  async getActiveOrderByTable(tableNumber: string) {
    const [order] = await db.select().from(orders).where(
      and(
        eq(orders.tableNumber, tableNumber),
        ne(orders.status, "Complete")
      )
    );
    return order;
  }

  async updateOrder(id: number, updates: Partial<InsertOrder>) {
    const [updated] = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async completeOrders(ids: number[]) {
    await db.update(orders)
      .set({ status: "Complete", completedAt: new Date() })
      .where(inArray(orders.id, ids));
  }

  async uncompleteOrder(id: number) {
    await db.update(orders)
      .set({ status: "Pending", completedAt: null })
      .where(eq(orders.id, id));
  }

  async payOrder(id: number, method: string) {
    await db.delete(kitchenOrders).where(eq(kitchenOrders.orderId, id));
    await db.update(orders)
      .set({ 
        paymentStatus: "Paid", 
        paymentMethod: method,
        paidAt: new Date(),
        status: "Complete",
        completedAt: new Date()
      })
      .where(eq(orders.id, id));
  }

  async unpayOrder(id: number) {
    await db.update(orders)
      .set({ 
        paymentStatus: "Unpaid",
        paymentMethod: null,
        paidAt: null,
        status: "Ready",
        completedAt: null
      })
      .where(eq(orders.id, id));
  }

  async deleteOrder(id: number) {
    await db.delete(kitchenOrders).where(eq(kitchenOrders.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }

  async sendToKitchen(orderId: number) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    
    // Get menu items to check isHidden
    const allMenuItems = await db.select().from(menuItems).where(eq(menuItems.isActive, true));
    const hiddenMenuItemIds = new Set(
      allMenuItems.filter(m => m.isHidden).map(m => m.id)
    );
    
    // Get all existing kitchen items for this order to calculate what's already been sent
    const existingKitchenOrders = await db.select().from(kitchenOrders)
      .where(eq(kitchenOrders.orderId, orderId));

    const alreadySentMap: Record<string, number> = {};
    for (const ko of existingKitchenOrders) {
      const items = ko.items as any[];
      for (const item of items) {
        const key = `${item.name}|${item.notes || ""}`;
        alreadySentMap[key] = (alreadySentMap[key] || 0) + item.quantity;
      }
    }

    // Calculate new items to send (the difference), excluding hidden items
    const itemsToSent: any[] = [];
    for (const orderItem of (order.items as any[])) {
      // Skip if menu item is hidden
      if (orderItem.menuItemId && hiddenMenuItemIds.has(orderItem.menuItemId)) {
        continue;
      }
      
      const key = `${orderItem.name}|${orderItem.notes || ""}`;
      const sentQty = alreadySentMap[key] || 0;
      const diff = orderItem.quantity - sentQty;

      if (diff > 0) {
        itemsToSent.push({
          name: orderItem.name,
          quantity: diff,
          notes: orderItem.notes || null,
          cookingStatus: "cooking"
        });
      }
    }

    if (itemsToSent.length === 0) {
      // Nothing new to send, but ensure order status is updated if it was Pending
      if (order.status === "Pending") {
        await db.update(orders).set({ status: "InKitchen" }).where(eq(orders.id, orderId));
      }
      // Return the most recent kitchen order if any, or throw
      if (existingKitchenOrders.length > 0) return existingKitchenOrders[0];
      throw new Error("No items to send to kitchen");
    }

    // Check if there's an active (not Done) kitchen order to merge into
    const activeKO = existingKitchenOrders.find(ko => ko.status !== "Done");

    if (activeKO) {
      const updatedItems = [...(activeKO.items as any[]), ...itemsToSent];
      const [updated] = await db.update(kitchenOrders)
        .set({ items: updatedItems, status: "Cooking" })
        .where(eq(kitchenOrders.id, activeKO.id))
        .returning();
      
      await db.update(orders).set({ status: "InKitchen" }).where(eq(orders.id, orderId));
      return updated;
    } else {
      // Create new kitchen order
      const [created] = await db.insert(kitchenOrders).values({
        orderId: order.id,
        tableNumber: order.tableNumber,
        items: itemsToSent,
        status: "Cooking",
        priority: "normal"
      }).returning();

      await db.update(orders).set({ status: "InKitchen" }).where(eq(orders.id, orderId));
      return created;
    }
  }

  async getKitchenOrders() {
    return await db.select().from(kitchenOrders).orderBy(desc(kitchenOrders.sentAt));
  }

  async getKitchenOrder(id: number) {
    const [order] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, id));
    return order;
  }

  async startKitchenOrder(id: number) {
    await db.update(kitchenOrders)
      .set({ status: "Cooking", startedAt: new Date() })
      .where(eq(kitchenOrders.id, id));
  }

  async startKitchenItem(kitchenOrderId: number, itemName: string, notes?: string) {
    const [kitchenOrder] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, kitchenOrderId));
    if (!kitchenOrder) return;

    let found = false;
    const items = kitchenOrder.items as any[];
    const updatedItems = items.map(item => {
      if (!found && item.name === itemName && (notes === undefined || item.notes === notes) && (item.cookingStatus === "pending" || !item.cookingStatus)) {
        found = true;
        return { ...item, cookingStatus: "cooking" };
      }
      return item;
    });

    await db.update(kitchenOrders)
      .set({ 
        items: updatedItems,
        status: "Cooking",
        startedAt: kitchenOrder.startedAt || new Date()
      })
      .where(eq(kitchenOrders.id, kitchenOrderId));

    // FIX: Update parent order status to InKitchen
    await db.update(orders)
      .set({ status: "InKitchen" })
      .where(eq(orders.id, kitchenOrder.orderId));
  }

  async completeKitchenOrder(id: number) {
    const kitchenOrder = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, id));
    if (kitchenOrder[0]) {
      // Mark all items as done
      const items = kitchenOrder[0].items as any[];
      const updatedItems = items.map(item => ({ ...item, cookingStatus: "done" }));

      await db.update(kitchenOrders)
        .set({ status: "Done", items: updatedItems, completedAt: new Date() })
        .where(eq(kitchenOrders.id, id));

      const relatedOrder = await this.getOrder(kitchenOrder[0].orderId);
      if (relatedOrder) {
        await db.update(orders)
          .set({ status: "Ready" })
          .where(eq(orders.id, relatedOrder.id));
      }
    }
  }

  async completeKitchenItem(kitchenOrderId: number, itemName: string, notes?: string) {
    const [kitchenOrder] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, kitchenOrderId));
    if (!kitchenOrder) return;

    let found = false;
    const items = kitchenOrder.items as any[];
    const updatedItems = items.map(item => {
      if (!found && item.name === itemName && (notes === undefined || (item.notes || null) === (notes || null)) && item.cookingStatus !== "done") {
        found = true;
        return { ...item, cookingStatus: "done" };
      }
      return item;
    });

    await db.update(kitchenOrders)
      .set({ items: updatedItems })
      .where(eq(kitchenOrders.id, kitchenOrderId));

    // If all items in this specific kitchen order are done, mark the kitchen order as Done
    if (updatedItems.every(item => item.cookingStatus === "done")) {
      await db.update(kitchenOrders)
        .set({ status: "Done", completedAt: new Date() })
        .where(eq(kitchenOrders.id, kitchenOrderId));

      // Check if ALL kitchen orders for this orderId are Done
      const allKOs = await db.select().from(kitchenOrders).where(eq(kitchenOrders.orderId, kitchenOrder.orderId));
      if (allKOs.every(ko => ko.status === "Done")) {
        const relatedOrder = await this.getOrder(kitchenOrder.orderId);
        if (relatedOrder) {
          await db.update(orders)
            .set({ status: "Ready" })
            .where(eq(orders.id, relatedOrder.id));
        }
      }
    }
  }

  async getDailyReport() {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const todayOrders = await db.select().from(orders);
    
    const paidOrders = todayOrders.filter(o => 
      o.paymentStatus === "Paid" && o.paidAt && new Date(o.paidAt) >= start && new Date(o.paidAt) <= end
    );
    
    const todayRevenue = paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const completedOrders = paidOrders.length;
    const pendingOrders = todayOrders.filter(o => o.status === "Pending" || o.status === "InKitchen" || o.status === "Ready").length;
    const kitchenActive = (await this.getActiveKitchenOrders()).length;

    return {
      todayRevenue,
      completedOrders,
      pendingOrders,
      kitchenActive
    };
  }

  async getBestSellers() {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // Get all orders and filter to those paid today
    const allOrders = await db.select().from(orders);
    
    const itemCounts: Record<string, number> = {};
    
    // Only count orders that were paid TODAY
    allOrders.forEach(order => {
      if (order.paymentStatus !== "Paid" || !order.paidAt) return;
      const paidAt = new Date(order.paidAt);
      if (paidAt < start || paidAt > end) return;
      
      const items = order.items as any[];
      items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = 0;
        }
        itemCounts[item.name] += item.quantity;
      });
    });

    return Object.entries(itemCounts)
      .map(([name, totalQuantity]) => ({ name, totalQuantity }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);
  }

  async getPaymentSettings() {
    return await db.select().from(paymentSettings);
  }

  async clearOldCompletedKitchenOrders(): Promise<number> {
    const todayStart = startOfToday();
    
    const ordersToDelete = await db.select().from(kitchenOrders).where(
      and(
        eq(kitchenOrders.status, "Done"),
        lt(kitchenOrders.completedAt, todayStart)
      )
    );
    
    if (ordersToDelete.length === 0) return 0;
    
    const idsToDelete = ordersToDelete.map(o => o.id);
    await db.delete(kitchenOrders).where(inArray(kitchenOrders.id, idsToDelete));
    
    return ordersToDelete.length;
  }

  async updatePaymentSetting(method: string, data: Partial<InsertPaymentSetting>) {
    const [updated] = await db.update(paymentSettings)
      .set(data)
      .where(eq(paymentSettings.method, method))
      .returning();
    
    if (!updated) {
      const [created] = await db.insert(paymentSettings)
        .values({ method, ...data })
        .returning();
      return created;
    }
    return updated;
  }

  async runMigrations() {
    console.log("[STORAGE] Using Fly Postgres - tables managed via Drizzle");
  }

  async addIsStickyColumn() {
    console.log("[STORAGE] addIsStickyColumn: column already exists");
  }

  async addIsPriorityColumn() {
    console.log("[STORAGE] addIsPriorityColumn: column already exists");
  }
}

export const storage = new DatabaseStorage();
