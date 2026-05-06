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
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
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
ALTER TABLE "menu_items" ADD COLUMN "is_sticky" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_priority" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_hidden" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;