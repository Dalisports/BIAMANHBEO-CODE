CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
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
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"category_id" integer,
	"description" text,
	"image" text,
	"is_available" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
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
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;