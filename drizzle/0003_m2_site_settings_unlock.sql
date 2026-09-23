CREATE TYPE "public"."unlock_mode" AS ENUM('link', 'rewarded');--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"unlock_enabled" boolean DEFAULT false NOT NULL,
	"unlock_mode" "unlock_mode" DEFAULT 'link' NOT NULL,
	"unlock_link_url" text,
	"unlock_revision" integer DEFAULT 1 NOT NULL,
	"ad_slots" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid,
	"updated_by_label" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "site_settings_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_label" varchar(160) NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlock_challenges" (
	"nonce" varchar(64) PRIMARY KEY NOT NULL,
	"provider" varchar(32) NOT NULL,
	"reader_hash" varchar(64) NOT NULL,
	"revision" integer NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"provider_ref" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "unlock_challenges_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings_audit" ADD CONSTRAINT "site_settings_audit_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_settings_audit_changed_idx" ON "site_settings_audit" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "unlock_challenges_expires_idx" ON "unlock_challenges" USING btree ("expires_at");--> statement-breakpoint
INSERT INTO "site_settings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;