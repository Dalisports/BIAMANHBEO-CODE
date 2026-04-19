import { pgTable, serial, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  isSticky: boolean("is_sticky").default(false),
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

export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  method: text("method").notNull().unique(),
  label: text("label"),
  icon: text("icon"),
  qrImageUrl: text("qr_image_url"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  additionalInfo: text("additional_info"),
  isEnabled: boolean("is_enabled").default(true),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  fullName: text("full_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, completedAt: true, paidAt: true });
export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({ id: true, sentAt: true, startedAt: true, completedAt: true });
export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({ id: true });

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
  cookingStatus?: "pending" | "cooking" | "done";
};

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = z.infer<typeof insertKitchenOrderSchema>;

export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertPaymentSetting = z.infer<typeof insertPaymentSettingSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type UserRole = "owner" | "employee";
export type InsertUser = z.infer<typeof insertUserSchema>;
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
