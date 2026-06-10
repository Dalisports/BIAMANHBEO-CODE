import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  description: text("description"),
  image: text("image"),
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isSticky: integer("is_sticky", { mode: "boolean" }).default(false),
  isPriority: integer("is_priority", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableNumber: text("table_number").notNull(),
  customerName: text("customer_name"),
  phone: text("phone"),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("Pending"),
  paymentStatus: text("payment_status").notNull().default("Unpaid"),
  paymentMethod: text("payment_method"),
  items: text("items", { mode: "json" }).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  paidAt: integer("paid_at", { mode: "timestamp" }),
});

export const kitchenOrders = sqliteTable("kitchen_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  tableNumber: text("table_number").notNull(),
  items: text("items", { mode: "json" }).notNull(),
  status: text("status").notNull().default("Waiting"),
  priority: text("priority").default("normal"),
  sentAt: integer("sent_at", { mode: "timestamp" }).defaultNow(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export const paymentSettings = sqliteTable("payment_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  method: text("method").notNull().unique(),
  label: text("label"),
  icon: text("icon"),
  qrImageUrl: text("qr_image_url"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  additionalInfo: text("additional_info"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  fullName: text("full_name"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  fullName: text("full_name"),
  dateOfBirth: text("date_of_birth"),
  hometown: text("hometown"),
  idCardNumber: text("id_card_number"),
  phoneNumber: text("phone_number"),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const dailyQRCodes = sqliteTable("daily_qr_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("New Chat"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const attendanceRecords = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  qrCode: text("qr_code").notNull(),
  checkIn: integer("check_in", { mode: "timestamp" }),
  checkOut: integer("check_out", { mode: "timestamp" }),
  totalHours: integer("total_hours"),
  status: text("status").notNull().default("checked_in"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const shortcuts = sqliteTable("shortcuts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  position: integer("position").notNull().unique(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
});

export const instructions = sqliteTable("instructions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trigger: text("trigger").notNull(),
  instruction: text("instruction").notNull(),
  example: text("example"),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow().notNull(),
});

export const memory = sqliteTable("memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyInfo: text("key_info"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
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
export type Shortcut = typeof shortcuts.$inferSelect;

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, completedAt: true, paidAt: true });

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const insertInstructionSchema = createInsertSchema(instructions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Instruction = typeof instructions.$inferSelect;
export type InsertInstruction = z.infer<typeof insertInstructionSchema>;

export const insertMemorySchema = createInsertSchema(memory).omit({
  id: true,
  createdAt: true,
});
export type Memory = typeof memory.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({ id: true, sentAt: true, startedAt: true, completedAt: true });
export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

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

export type UserRole = "owner" | "employee";
export type InsertUser = z.infer<typeof insertUserSchema>;

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});