import { db } from "./db";
import { 
  menuItems, 
  orders, 
  categories,
  kitchenOrders,
  type InsertMenuItem,
  type InsertOrder,
  type InsertCategory,
  type InsertKitchenOrder,
  type Order,
  type KitchenOrder
} from "@shared/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

export interface IStorage {
  getCategories(): Promise<typeof categories.$inferSelect[]>;
  createCategory(category: InsertCategory): Promise<typeof categories.$inferSelect>;
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
  
  getDailyReport(): Promise<{ todayRevenue: number; completedOrders: number; pendingOrders: number; kitchenActive: number }>;
  getBestSellers(): Promise<{ name: string; totalQuantity: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getCategories() {
    return await db.select().from(categories).orderBy(categories.displayOrder);
  }

  async createCategory(category: InsertCategory) {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
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

  async createOrder(order: InsertOrder) {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
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
    await db.delete(orders).where(eq(orders.id, id));
  }

  async sendToKitchen(orderId: number) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    
    const kitchenItems = (order.items as any[]).map(item => ({
      name: item.name,
      quantity: item.quantity,
      notes: item.notes || null
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

  async startKitchenOrder(id: number) {
    await db.update(kitchenOrders)
      .set({ status: "Cooking", startedAt: new Date() })
      .where(eq(kitchenOrders.id, id));
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
}

export const storage = new DatabaseStorage();
