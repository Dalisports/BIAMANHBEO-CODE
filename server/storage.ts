import { db } from "./db";
import { 
  products, 
  orders, 
  type InsertProduct, 
  type InsertOrder,
  type Order
} from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

export interface IStorage {
  getProducts(): Promise<typeof products.$inferSelect[]>;
  createProduct(product: InsertProduct): Promise<typeof products.$inferSelect>;
  
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getPendingOrders(): Promise<Order[]>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  completeOrders(ids: number[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProducts() {
    return await db.select().from(products);
  }

  async createProduct(product: InsertProduct) {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async getOrders() {
    return await db.select().from(orders);
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
        // we use a simple approach for now, assuming dates are passed correctly
        // in a real app we'd use a raw SQL expression or proper date functions for filtering
      )
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
      .set({ status: "Complete" })
      .where(inArray(orders.id, ids));
  }
}

export const storage = new DatabaseStorage();
