import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { pgTable, serial, integer as pgInteger, text as pgText, boolean as pgBoolean, timestamp as pgTimestamp, jsonb as pgJsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// SQLite Schema Definitions (for Local Dev)
// ==========================================

export const categoriesSqlite = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const settingsSqlite = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const menuItemsSqlite = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  categoryId: integer("category_id").references(() => categoriesSqlite.id),
  description: text("description"),
  image: text("image"),
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isSticky: integer("is_sticky", { mode: "boolean" }).default(false),
  isPriority: integer("is_priority", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const ordersSqlite = sqliteTable("orders", {
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

export const kitchenOrdersSqlite = sqliteTable("kitchen_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => ordersSqlite.id),
  tableNumber: text("table_number").notNull(),
  items: text("items", { mode: "json" }).notNull(),
  status: text("status").notNull().default("Waiting"),
  priority: text("priority").default("normal"),
  sentAt: integer("sent_at", { mode: "timestamp" }).defaultNow(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export const paymentSettingsSqlite = sqliteTable("payment_settings", {
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

export const usersSqlite = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  fullName: text("full_name"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const userProfilesSqlite = sqliteTable("user_profiles", {
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

export const dailyQRCodesSqlite = sqliteTable("daily_qr_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const conversationsSqlite = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("New Chat"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const messagesSqlite = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversationsSqlite.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const attendanceRecordsSqlite = sqliteTable("attendance_records", {
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

export const shortcutsSqlite = sqliteTable("shortcuts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  position: integer("position").notNull().unique(),
  menuItemId: integer("menu_item_id").references(() => menuItemsSqlite.id),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const productsSqlite = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
});

export const instructionsSqlite = sqliteTable("instructions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trigger: text("trigger").notNull(),
  instruction: text("instruction").notNull(),
  example: text("example"),
  enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow().notNull(),
});

export const memorySqlite = sqliteTable("memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversationsSqlite.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyInfo: text("key_info"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
});

// ==========================================
// PostgreSQL Schema Definitions (for Production)
// ==========================================

export const categoriesPg = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull(),
  displayOrder: pgInteger("display_order").default(0),
  isActive: pgBoolean("is_active").default(true),
});

export const settingsPg = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: pgText("key").notNull().unique(),
  value: pgText("value"),
  updatedAt: pgTimestamp("updated_at").defaultNow(),
});

export const menuItemsPg = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull(),
  price: pgInteger("price").notNull(),
  categoryId: pgInteger("category_id").references(() => categoriesPg.id),
  description: pgText("description"),
  image: pgText("image"),
  isAvailable: pgBoolean("is_available").default(true),
  isActive: pgBoolean("is_active").default(true),
  isSticky: pgBoolean("is_sticky").default(false),
  isPriority: pgBoolean("is_priority").default(false),
  isHidden: pgBoolean("is_hidden").default(false),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const ordersPg = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableNumber: pgText("table_number").notNull(),
  customerName: pgText("customer_name"),
  phone: pgText("phone"),
  totalAmount: pgInteger("total_amount").notNull(),
  status: pgText("status").notNull().default("Pending"),
  paymentStatus: pgText("payment_status").notNull().default("Unpaid"),
  paymentMethod: pgText("payment_method"),
  items: pgJsonb("items").notNull(),
  notes: pgText("notes"),
  createdAt: pgTimestamp("created_at").defaultNow(),
  completedAt: pgTimestamp("completed_at"),
  paidAt: pgTimestamp("paid_at"),
});

export const kitchenOrdersPg = pgTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  orderId: pgInteger("order_id").notNull().references(() => ordersPg.id),
  tableNumber: pgText("table_number").notNull(),
  items: pgJsonb("items").notNull(),
  status: pgText("status").notNull().default("Waiting"),
  priority: pgText("priority").default("normal"),
  sentAt: pgTimestamp("sent_at").defaultNow(),
  startedAt: pgTimestamp("started_at"),
  completedAt: pgTimestamp("completed_at"),
  notes: pgText("notes"),
});

export const paymentSettingsPg = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  method: pgText("method").notNull().unique(),
  label: pgText("label"),
  icon: pgText("icon"),
  qrImageUrl: pgText("qr_image_url"),
  accountName: pgText("account_name"),
  accountNumber: pgText("account_number"),
  bankName: pgText("bank_name"),
  additionalInfo: pgText("additional_info"),
  isEnabled: pgBoolean("is_enabled").default(true),
});

export const usersPg = pgTable("users", {
  id: serial("id").primaryKey(),
  username: pgText("username").notNull().unique(),
  password: pgText("password").notNull(),
  role: pgText("role").notNull().default("employee"),
  fullName: pgText("full_name"),
  isActive: pgBoolean("is_active").default(true),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const userProfilesPg = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: pgInteger("user_id").notNull().unique(),
  fullName: pgText("full_name"),
  dateOfBirth: pgText("date_of_birth"),
  hometown: pgText("hometown"),
  idCardNumber: pgText("id_card_number"),
  phoneNumber: pgText("phone_number"),
  isLocked: pgBoolean("is_locked").default(false),
  createdAt: pgTimestamp("created_at").defaultNow(),
  updatedAt: pgTimestamp("updated_at").defaultNow(),
});

export const dailyQRCodesPg = pgTable("daily_qr_codes", {
  id: serial("id").primaryKey(),
  date: pgText("date").notNull().unique(),
  qrCode: pgText("qr_code").notNull(),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const conversationsPg = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: pgText("title").notNull().default("New Chat"),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const messagesPg = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: pgInteger("conversation_id").notNull().references(() => conversationsPg.id),
  role: pgText("role").notNull(),
  content: pgText("content").notNull(),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const attendanceRecordsPg = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: pgInteger("user_id").notNull(),
  date: pgText("date").notNull(),
  qrCode: pgText("qr_code").notNull(),
  checkIn: pgTimestamp("check_in"),
  checkOut: pgTimestamp("check_out"),
  totalHours: pgInteger("total_hours"),
  status: pgText("status").notNull().default("checked_in"),
  createdAt: pgTimestamp("created_at").defaultNow(),
});

export const shortcutsPg = pgTable("shortcuts", {
  id: serial("id").primaryKey(),
  position: pgInteger("position").notNull().unique(),
  menuItemId: pgInteger("menu_item_id").references(() => menuItemsPg.id),
  createdAt: pgTimestamp("created_at").defaultNow(),
  updatedAt: pgTimestamp("updated_at").defaultNow(),
});

export const productsPg = pgTable("products", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull(),
  price: pgInteger("price").notNull(),
});

export const instructionsPg = pgTable("instructions", {
  id: serial("id").primaryKey(),
  trigger: pgText("trigger").notNull(),
  instruction: pgText("instruction").notNull(),
  example: pgText("example"),
  enabled: pgBoolean("enabled").default(true).notNull(),
  createdAt: pgTimestamp("created_at").defaultNow().notNull(),
  updatedAt: pgTimestamp("updated_at").defaultNow().notNull(),
});

export const memoryPg = pgTable("memory", {
  id: serial("id").primaryKey(),
  conversationId: pgInteger("conversation_id").notNull().references(() => conversationsPg.id, { onDelete: "cascade" }),
  summary: pgText("summary").notNull(),
  keyInfo: pgText("key_info"),
  createdAt: pgTimestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// Dynamic Exports Wrapper
// ==========================================

const isPostgres = typeof process !== "undefined" && (process.env.DATABASE_URL?.startsWith("postgres://") || process.env.DATABASE_URL?.startsWith("postgresql://"));

export const categories = (isPostgres ? categoriesPg : categoriesSqlite) as typeof categoriesSqlite;
export const settings = (isPostgres ? settingsPg : settingsSqlite) as typeof settingsSqlite;
export const menuItems = (isPostgres ? menuItemsPg : menuItemsSqlite) as typeof menuItemsSqlite;
export const orders = (isPostgres ? ordersPg : ordersSqlite) as typeof ordersSqlite;
export const kitchenOrders = (isPostgres ? kitchenOrdersPg : kitchenOrdersSqlite) as typeof kitchenOrdersSqlite;
export const paymentSettings = (isPostgres ? paymentSettingsPg : paymentSettingsSqlite) as typeof paymentSettingsSqlite;
export const users = (isPostgres ? usersPg : usersSqlite) as typeof usersSqlite;
export const userProfiles = (isPostgres ? userProfilesPg : userProfilesSqlite) as typeof userProfilesSqlite;
export const dailyQRCodes = (isPostgres ? dailyQRCodesPg : dailyQRCodesSqlite) as typeof dailyQRCodesSqlite;
export const conversations = (isPostgres ? conversationsPg : conversationsSqlite) as typeof conversationsSqlite;
export const messages = (isPostgres ? messagesPg : messagesSqlite) as typeof messagesSqlite;
export const attendanceRecords = (isPostgres ? attendanceRecordsPg : attendanceRecordsSqlite) as typeof attendanceRecordsSqlite;
export const shortcuts = (isPostgres ? shortcutsPg : shortcutsSqlite) as typeof shortcutsSqlite;
export const products = (isPostgres ? productsPg : productsSqlite) as typeof productsSqlite;
export const instructions = (isPostgres ? instructionsPg : instructionsSqlite) as typeof instructionsSqlite;
export const memory = (isPostgres ? memoryPg : memorySqlite) as typeof memorySqlite;

// Export types and insert schemas based on SQLite definition statically for client/Zod safety
export type Category = typeof categoriesSqlite.$inferSelect;
export type InsertCategory = typeof categoriesSqlite.$inferInsert;
export type MenuItem = typeof menuItemsSqlite.$inferSelect;
export type InsertMenuItem = typeof menuItemsSqlite.$inferInsert;
export type Order = typeof ordersSqlite.$inferSelect;
export type InsertOrder = typeof ordersSqlite.$inferInsert;
export type KitchenOrder = typeof kitchenOrdersSqlite.$inferSelect;
export type InsertKitchenOrder = typeof kitchenOrdersSqlite.$inferInsert;
export type PaymentSetting = typeof paymentSettingsSqlite.$inferSelect;
export type InsertPaymentSetting = typeof paymentSettingsSqlite.$inferInsert;
export type User = typeof usersSqlite.$inferSelect;
export type UserProfile = typeof userProfilesSqlite.$inferSelect;
export type InsertUserProfile = typeof userProfilesSqlite.$inferInsert;
export type DailyQRCode = typeof dailyQRCodesSqlite.$inferSelect;
export type AttendanceRecord = typeof attendanceRecordsSqlite.$inferSelect;
export type Conversation = typeof conversationsSqlite.$inferSelect;
export type Message = typeof messagesSqlite.$inferSelect;
export type Shortcut = typeof shortcutsSqlite.$inferSelect;

export const insertCategorySchema = createInsertSchema(categoriesSqlite).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItemsSqlite).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(ordersSqlite).omit({ id: true, createdAt: true, completedAt: true, paidAt: true });

export const insertProductSchema = createInsertSchema(productsSqlite).omit({ id: true });
export type Product = typeof productsSqlite.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const insertInstructionSchema = createInsertSchema(instructionsSqlite).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Instruction = typeof instructionsSqlite.$inferSelect;
export type InsertInstruction = z.infer<typeof insertInstructionSchema>;

export const insertMemorySchema = createInsertSchema(memorySqlite).omit({
  id: true,
  createdAt: true,
});
export type Memory = typeof memorySqlite.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;

export const insertUserProfileSchema = createInsertSchema(userProfilesSqlite).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKitchenOrderSchema = createInsertSchema(kitchenOrdersSqlite).omit({ id: true, sentAt: true, startedAt: true, completedAt: true });
export const insertPaymentSettingSchema = createInsertSchema(paymentSettingsSqlite).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversationsSqlite).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesSqlite).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(usersSqlite).omit({ id: true, createdAt: true });

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