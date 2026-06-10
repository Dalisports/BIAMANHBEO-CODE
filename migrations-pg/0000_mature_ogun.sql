CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	"qr_code" text NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"total_hours" integer,
	"status" text DEFAULT 'checked_in' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"qr_code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_qr_codes_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "instructions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" text NOT NULL,
	"instruction" text NOT NULL,
	"example" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"table_number" text NOT NULL,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'Waiting' NOT NULL,
	"priority" text DEFAULT 'normal',
	"sent_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"summary" text NOT NULL,
	"key_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"category_id" integer,
	"description" text,
	"image" text,
	"is_available" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"is_sticky" boolean DEFAULT false,
	"is_priority" boolean DEFAULT false,
	"is_hidden" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_number" text NOT NULL,
	"customer_name" text,
	"phone" text,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"payment_status" text DEFAULT 'Unpaid' NOT NULL,
	"payment_method" text,
	"items" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"method" text NOT NULL,
	"label" text,
	"icon" text,
	"qr_image_url" text,
	"account_name" text,
	"account_number" text,
	"bank_name" text,
	"additional_info" text,
	"is_enabled" boolean DEFAULT true,
	CONSTRAINT "payment_settings_method_unique" UNIQUE("method")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "shortcuts" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"menu_item_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shortcuts_position_unique" UNIQUE("position")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"full_name" text,
	"date_of_birth" text,
	"hometown" text,
	"id_card_number" text,
	"phone_number" text,
	"is_locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"full_name" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortcuts" ADD CONSTRAINT "shortcuts_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;