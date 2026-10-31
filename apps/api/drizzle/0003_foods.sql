-- Accent- and typo-tolerant search on food names and brands (written by hand, not generated).
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- unaccent() is only STABLE (its dictionary could change), so it cannot be indexed directly; this
-- wrapper names the dictionary explicitly and is declared IMMUTABLE for the trigram indexes.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
	AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;--> statement-breakpoint
CREATE TYPE "public"."food_quality" AS ENUM('ok', 'incoherent', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('ciqual', 'off', 'user');--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"food_id" uuid,
	"recipe_id" uuid,
	CONSTRAINT "favorites_target_check" CHECK (num_nonnulls("favorites"."food_id", "favorites"."recipe_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "food_portions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"food_id" uuid NOT NULL,
	"label" text NOT NULL,
	"grams" numeric(6, 2) NOT NULL,
	CONSTRAINT "food_portions_grams_check" CHECK ("food_portions"."grams" > 0)
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"source" "food_source" NOT NULL,
	"source_ref" text,
	"name" text NOT NULL,
	"brand" text,
	"kcal_100g" numeric(6, 2) NOT NULL,
	"protein_100g" numeric(6, 2) NOT NULL,
	"carbs_100g" numeric(6, 2) NOT NULL,
	"fat_100g" numeric(6, 2) NOT NULL,
	"fiber_100g" numeric(6, 2),
	"salt_100g" numeric(6, 2),
	"default_portion_g" numeric(6, 2),
	"off_synced_at" timestamp with time zone,
	"quality_flag" "food_quality" DEFAULT 'ok' NOT NULL,
	CONSTRAINT "foods_owner_check" CHECK (("foods"."source" = 'user') = ("foods"."owner_id" is not null)),
	CONSTRAINT "foods_source_ref_check" CHECK ("foods"."source" = 'user' or "foods"."source_ref" is not null),
	CONSTRAINT "foods_nutrients_check" CHECK ("foods"."kcal_100g" >= 0 and "foods"."protein_100g" >= 0 and "foods"."carbs_100g" >= 0
        and "foods"."fat_100g" >= 0 and coalesce("foods"."fiber_100g", 0) >= 0
        and coalesce("foods"."salt_100g", 0) >= 0),
	CONSTRAINT "foods_default_portion_check" CHECK ("foods"."default_portion_g" is null or "foods"."default_portion_g" > 0)
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_server_seq_idx" ON "favorites" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "food_portions_food_id_idx" ON "food_portions" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "food_portions_owner_id_idx" ON "food_portions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "food_portions_server_seq_idx" ON "food_portions" USING btree ("server_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_ref_idx" ON "foods" USING btree ("source","source_ref");--> statement-breakpoint
CREATE INDEX "foods_owner_id_idx" ON "foods" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "foods_server_seq_idx" ON "foods" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "foods_name_trgm_idx" ON "foods" USING gin (f_unaccent("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "foods_brand_trgm_idx" ON "foods" USING gin (f_unaccent("brand") gin_trgm_ops);