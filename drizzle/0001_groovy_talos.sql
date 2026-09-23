ALTER TABLE "stories" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "stories" SET "completed" = true WHERE "status" = 'completed';
