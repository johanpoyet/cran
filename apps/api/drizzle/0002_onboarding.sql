CREATE TYPE "public"."target_method" AS ENUM('formula', 'adaptive');--> statement-breakpoint
CREATE TYPE "public"."target_status" AS ENUM('on_track', 'too_fast', 'too_slow', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."weigh_in_source" AS ENUM('manual', 'healthkit', 'health_connect');--> statement-breakpoint
CREATE TABLE "weekly_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"week_start" date NOT NULL,
	"maintenance_kcal" integer NOT NULL,
	"target_kcal" integer NOT NULL,
	"protein_g" smallint NOT NULL,
	"carbs_g" smallint NOT NULL,
	"fat_g" smallint NOT NULL,
	"method" "target_method" NOT NULL,
	"status" "target_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weigh_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"date" date NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"source" "weigh_in_source" NOT NULL,
	"external_id" text
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "health_data_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "weekly_targets" ADD CONSTRAINT "weekly_targets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weigh_ins" ADD CONSTRAINT "weigh_ins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_targets_user_week_idx" ON "weekly_targets" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE INDEX "weekly_targets_server_seq_idx" ON "weekly_targets" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "weigh_ins_user_date_idx" ON "weigh_ins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "weigh_ins_server_seq_idx" ON "weigh_ins" USING btree ("server_seq");