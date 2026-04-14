import { db } from "./db";
import { 
  menuItems, 
  orders, 
  categories,
  kitchenOrders,
  paymentSettings,
  type InsertMenuItem,
  type InsertOrder,
  type InsertCategory,
  type InsertKitchenOrder,
  type InsertPaymentSetting,
  type Order,
  type KitchenOrder,
  type PaymentSetting
} from "@shared/schema";
import { eq, inArray, and, desc, lt } from "drizzle-orm";
import { startOfDay, endOfDay, startOfToday } from "date-fns";

export interface IStorage {
  getCategories(): Promise<typeof categories.$inferSelect[]>;
  createCategory(category: InsertCategory): Promise<typeof categories.$inferSelect>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<typeof categories.$inferSelect>;
  deleteCategory(id: number): Promise<void>;

  getMenuItems(): Promise<typeof menuItems.$inferSelect[]>;
  createMenuItem(item: InsertMenuItem): Promise<typeof menuItems.$inferSelect>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<typeof menuItems.$inferSelect>;
  deleteMenuItem(id: number): Promise<void>;
  
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getPendingOrders(): Promise<Order[]>;
  getActiveKitchenOrders(): Promise<KitchenOrder[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  completeOrders(ids: number[]): Promise<void>;
  uncompleteOrder(id: number): Promise<void>;
  payOrder(id: number, method: string): Promise<void>;
  
  sendToKitchen(orderId: number): Promise<KitchenOrder>;
  getKitchenOrders(): Promise<KitchenOrder[]>;
  startKitchenOrder(id: number): Promise<void>;
  completeKitchenOrder(id: number): Promise<void>;
  startKitchenItem(kitchenOrderId: number, itemName: string): Promise<void>;
  completeKitchenItem(kitchenOrderId: number, itemName: string): Promise<void>;
  
  getDailyReport(): Promise<{ todayRevenue: number; completedOrders: number; pendingOrders: number; kitchenActive: number }>;
  getBestSellers(): Promise<{ name: string; totalQuantity: number }[]>;
  clearOldCompletedKitchenOrders(): Promise<number>;

  getPaymentSettings(): Promise<PaymentSetting[]>;
  updatePaymentSetting(method: string, data: Partial<InsertPaymentSetting>): Promise<PaymentSetting>;
}

export class DatabaseStorage implements IStorage {
  async getCategories() {
    return await db.select().from(categories).orderBy(categories.displayOrder);
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

  async deleteOrder(id: number) {
    await db.delete(kitchenOrders).where(eq(kitchenOrders.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }

  async sendToKitchen(orderId: number) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    
    const kitchenItems = (order.items as any[]).map(item => ({
      name: item.name,
      quantity: item.quantity,
      notes: item.notes || null,
      cookingStatus: "pending"
    }));

    const [created] = await db.insert(kitchenOrders).values({
      orderId: order.id,
      tableNumber: order.tableNumber,
      items: kitchenItems,
      status: "Waiting",
      priority: "normal"
    }).returning();

    await db.update(orders)
      .set({ status: "InKitchen" })
      .where(eq(orders.id, orderId));

    return created;
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

  async startKitchenItem(kitchenOrderId: number, itemName: string) {
    const [kitchenOrder] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, kitchenOrderId));
    if (!kitchenOrder) return;

    const items = kitchenOrder.items as any[];
    const updatedItems = items.map(item => {
      if (item.name === itemName) {
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
  }

  async completeKitchenOrder(id: number) {
    const kitchenOrder = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, id));
    if (kitchenOrder[0]) {
      await db.update(kitchenOrders)
        .set({ status: "Done", completedAt: new Date() })
        .where(eq(kitchenOrders.id, id));

      const relatedOrder = await this.getOrder(kitchenOrder[0].orderId);
      if (relatedOrder) {
        await db.update(orders)
          .set({ status: "Ready" })
          .where(eq(orders.id, relatedOrder.id));
      }
    }
  }

  async completeKitchenItem(kitchenOrderId: number, itemName: string) {
    const [kitchenOrder] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, kitchenOrderId));
    if (!kitchenOrder) return;

    const items = kitchenOrder.items as any[];
    const updatedItems = items.map(item => {
      if (item.name === itemName) {
        return { ...item, cookingStatus: "done" };
      }
      return item;
    });

    await db.update(kitchenOrders)
      .set({ items: updatedItems })
      .where(eq(kitchenOrders.id, kitchenOrderId));

    const allDone = updatedItems.every(item => item.cookingStatus === "done");
    if (allDone) {
      await db.update(kitchenOrders)
        .set({ status: "Done", completedAt: new Date() })
        .where(eq(kitchenOrders.id, kitchenOrderId));

      const relatedOrder = await this.getOrder(kitchenOrder.orderId);
      if (relatedOrder) {
        await db.update(orders)
          .set({ status: "Ready" })
          .where(eq(orders.id, relatedOrder.id));
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
    const allOrders = await db.select().from(orders);
    
    const itemCounts: Record<string, number> = {};
    
    allOrders.forEach(order => {
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
}

export const storage = new DatabaseStorage();
