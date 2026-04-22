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
  isPriority: boolean("is_priority").default(false),
  isHidden: boolean("is_hidden").default(false),
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  fullName: text("full_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  fullName: text("full_name"),
  dateOfBirth: text("date_of_birth"),
  hometown: text("hometown"),
  idCardNumber: text("id_card_number"),
  phoneNumber: text("phone_number"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyQRCodes = pgTable("daily_qr_codes", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  qrCode: text("qr_code").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  totalHours: integer("total_hours"),
  status: text("status").notNull().default("checked_in"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = typeof kitchenOrders.$inferInsert;
export type PaymentSetting = typeof paymentSettings.$inferSelect;
export type InsertPaymentSetting = typeof paymentSettings.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type DailyQRCode = typeof dailyQRCodes.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, completedAt: true, paidAt: true });

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});