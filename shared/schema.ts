import { pgTable, serial, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  description: text("description"),
  image: text("image"),
  isAvailable: boolean("is_available").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableNumber: text("table_number").notNull(),
  customerName: text("customer_name"),
  phone: text("phone"),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("Pending"),
  paymentStatus: text("payment_status").notNull().default("Unpaid"),
  paymentMethod: text("payment_method"),
  items: jsonb("items").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  paidAt: timestamp("paid_at"),
});

export const kitchenOrders = pgTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  tableNumber: text("table_number").notNull(),
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("Waiting"),
  priority: text("priority").default("normal"),
  sentAt: timestamp("sent_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, completedAt: true, paidAt: true });
export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({ id: true, sentAt: true, startedAt: true, completedAt: true });

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type OrderItem = {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
};

export type KitchenItem = {
  name: string;
  quantity: number;
  notes?: string;
};

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = z.infer<typeof insertKitchenOrderSchema>;
