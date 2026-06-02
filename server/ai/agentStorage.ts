import { db } from "../db";
import { products, orders, kitchenOrders, menuItems } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getProducts(): Promise<any[]>;
  createProduct(product: any): Promise<any>;
  updateProduct(id: number, product: any): Promise<any>;
  deleteProduct(id: number): Promise<void>;

  getOrders(): Promise<any[]>;
  getOrder(id: number): Promise<any>;
  getPendingOrders(): Promise<any[]>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<any[]>;
  createOrder(order: any): Promise<any>;
  sendToKitchen(orderId: number): Promise<void>;
  enrichOrderItems(items: { name: string; quantity: number; price: number }[]): Promise<{ menuItemId: number; name: string; quantity: number; price: number }[]>;
  updateOrder(id: number, order: any): Promise<any>;
  deleteOrder(id: number): Promise<void>;
  completeOrders(ids: number[]): Promise<void>;
  uncompleteOrder(id: number): Promise<void>;
}

export class AgentStorage implements IStorage {
  async getProducts() {
    return await db.select({
      id: menuItems.id,
      name: menuItems.name,
      price: menuItems.price,
      categoryId: menuItems.categoryId,
      description: menuItems.description,
      image: menuItems.image,
      isAvailable: menuItems.isAvailable,
      isActive: menuItems.isActive,
      isHidden: menuItems.isHidden,
    }).from(menuItems).where(eq(menuItems.isActive, true));
  }

  async createProduct(product: any) {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, updates: any) {
    const [updated] = await db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number) {
    await db.delete(products).where(eq(products.id, id));
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

  async getOrdersByDateRange(startDate: Date, endDate: Date) {
    return await db.select().from(orders).where(
      and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );
  }

  async createOrder(order: any) {
    const [created] = await db.insert(orders).values({
      ...order,
      tableNumber: order.tableNumber || "AI-ORDER",
      customerName: order.customerName || "Khách AI",
      phone: order.phone || "",
      paymentStatus: "Unpaid",
    }).returning();
    return created;
  }

  async sendToKitchen(orderId: number) {
    const order = await this.getOrder(orderId);
    if (!order) return;

    const items = order.items as any[];
    const kitchenItems = items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      notes: item.notes || null,
      cookingStatus: "pending",
    }));

    await db.insert(kitchenOrders).values({
      orderId: order.id,
      tableNumber: order.tableNumber,
      items: kitchenItems,
      status: "Cooking",
      priority: "normal",
    });

    await db.update(orders)
      .set({ status: "InKitchen" })
      .where(eq(orders.id, orderId));
  }

  async enrichOrderItems(items: { name: string; quantity: number; price: number }[]) {
    const result: { menuItemId: number; name: string; quantity: number; price: number }[] = [];
    const allItems = await db.select().from(menuItems).where(eq(menuItems.isActive, true));

    for (const item of items) {
      const lowerName = item.name.toLowerCase().trim();
      // Tìm chính xác trước
      let matched = allItems.find(m => m.name.toLowerCase() === lowerName);
      // Thử partial match
      if (!matched) {
        matched = allItems.find(m =>
          m.name.toLowerCase().includes(lowerName) ||
          lowerName.includes(m.name.toLowerCase())
        );
      }
      if (matched) {
        result.push({
          menuItemId: matched.id,
          name: matched.name,
          quantity: item.quantity,
          price: matched.price,
        });
      } else {
        // Không tìm thấy → dùng name provided, menuItemId = 0
        result.push({
          menuItemId: 0,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        });
      }
    }
    return result;
  }

  async updateOrder(id: number, updates: any) {
    const [updated] = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async completeOrders(ids: number[]) {
    await db.update(orders)
      .set({ status: "Complete", completedAt: new Date() })
      .where(eq(orders.id, ids[0]));
  }

  async uncompleteOrder(id: number) {
    await db.update(orders)
      .set({ status: "Pending", completedAt: null })
      .where(eq(orders.id, id));
  }

  async deleteOrder(id: number) {
    await db.delete(orders).where(eq(orders.id, id));
  }
}

export const agentStorage = new AgentStorage();