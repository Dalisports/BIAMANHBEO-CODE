CREATE TABLE IF NOT EXISTS "payment_settings" (
	"id" serial PRIMARY KEY,
	"method" text NOT NULL UNIQUE,
	"label" text,
	"icon" text,
	"qr_image_url" text,
	"account_name" text,
	"account_number" text,
	"bank_name" text,
	"additional_info" text,
	"is_enabled" boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS "payment_settings_method_idx" ON "payment_settings"("method");
