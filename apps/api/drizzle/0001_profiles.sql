CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE SEQUENCE "public"."server_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"sex" "sex" NOT NULL,
	"birth_year" smallint NOT NULL,
	"height_cm" smallint NOT NULL,
	"activity_level" smallint NOT NULL,
	"goal_rate_kg_month" numeric(2, 1) NOT NULL,
	"protein_g_per_kg" numeric(3, 2) DEFAULT 2.2 NOT NULL,
	"fat_g_per_kg" numeric(3, 2) DEFAULT 1.25 NOT NULL,
	"training_bonus_kcal" smallint DEFAULT 150 NOT NULL,
	"training_days" smallint DEFAULT 0 NOT NULL,
	"water_goal_ml" integer DEFAULT 3000 NOT NULL,
	"reminders" jsonb DEFAULT '{"meal":{"enabled":true,"time":"14:00"},"weighIn":{"enabled":true,"time":"08:00"},"weeklyReview":{"enabled":false,"time":"19:00"}}'::jsonb NOT NULL,
	CONSTRAINT "profiles_activity_level_check" CHECK ("profiles"."activity_level" between 1 and 5),
	CONSTRAINT "profiles_goal_rate_check" CHECK ("profiles"."goal_rate_kg_month" in (0.5, 1, 1.5)),
	CONSTRAINT "profiles_training_days_check" CHECK ("profiles"."training_days" between 0 and 127)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_server_seq_idx" ON "profiles" USING btree ("server_seq");