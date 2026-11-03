CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'snack', 'dinner');--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"food_id" uuid,
	"recipe_id" uuid,
	"label" text NOT NULL,
	"grams" numeric(6, 2),
	"portion_label" text,
	"kcal" numeric(6, 2) NOT NULL,
	"protein_g" numeric(6, 2) NOT NULL,
	"carbs_g" numeric(6, 2) NOT NULL,
	"fat_g" numeric(6, 2) NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	CONSTRAINT "log_entries_values_check" CHECK ("log_entries"."kcal" >= 0 and "log_entries"."protein_g" >= 0 and "log_entries"."carbs_g" >= 0 and "log_entries"."fat_g" >= 0
        and ("log_entries"."grams" is null or "log_entries"."grams" > 0))
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"date" date NOT NULL,
	"ml" integer NOT NULL,
	CONSTRAINT "water_logs_ml_check" CHECK ("water_logs"."ml" > 0)
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"date" date NOT NULL,
	"arm_cm" numeric(5, 2),
	"chest_cm" numeric(5, 2),
	"waist_cm" numeric(5, 2),
	"thigh_cm" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "meal_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"template_id" uuid NOT NULL,
	"food_id" uuid,
	"recipe_id" uuid,
	"grams" numeric(6, 2) NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "meal_template_items_target_check" CHECK (num_nonnulls("meal_template_items"."food_id", "meal_template_items"."recipe_id") = 1),
	CONSTRAINT "meal_template_items_grams_check" CHECK ("meal_template_items"."grams" > 0)
);
--> statement-breakpoint
CREATE TABLE "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"name" text NOT NULL,
	"meal_type" "meal_type"
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"recipe_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"grams" numeric(6, 2) NOT NULL,
	"is_raw" boolean DEFAULT true NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "recipe_ingredients_grams_check" CHECK ("recipe_ingredients"."grams" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_seq" bigint DEFAULT nextval('server_seq') NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"servings" numeric(5, 2) NOT NULL,
	"cooked_weight_g" numeric(6, 2),
	"notes" text,
	CONSTRAINT "recipes_servings_check" CHECK ("recipes"."servings" > 0)
);
--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_template_id_meal_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meal_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_entries_user_date_idx" ON "log_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "log_entries_server_seq_idx" ON "log_entries" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "water_logs_user_date_idx" ON "water_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "water_logs_server_seq_idx" ON "water_logs" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "measurements_user_date_idx" ON "measurements" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "measurements_server_seq_idx" ON "measurements" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "meal_template_items_template_id_idx" ON "meal_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "meal_template_items_server_seq_idx" ON "meal_template_items" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "meal_templates_user_id_idx" ON "meal_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_templates_server_seq_idx" ON "meal_templates" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_server_seq_idx" ON "recipe_ingredients" USING btree ("server_seq");--> statement-breakpoint
CREATE INDEX "recipes_user_id_idx" ON "recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipes_server_seq_idx" ON "recipes" USING btree ("server_seq");--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Sync cursor (written by hand, not generated): every write to a synchronised table takes the next
-- value of the shared sequence, inserts through the column default, updates through this trigger,
-- so that no code path can forget it.
CREATE OR REPLACE FUNCTION bump_server_seq() RETURNS trigger
	LANGUAGE plpgsql
	AS $$
BEGIN
	NEW.server_seq := nextval('server_seq');
	RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER profiles_server_seq BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER weigh_ins_server_seq BEFORE UPDATE ON weigh_ins FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER weekly_targets_server_seq BEFORE UPDATE ON weekly_targets FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER foods_server_seq BEFORE UPDATE ON foods FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER food_portions_server_seq BEFORE UPDATE ON food_portions FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER favorites_server_seq BEFORE UPDATE ON favorites FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER log_entries_server_seq BEFORE UPDATE ON log_entries FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER water_logs_server_seq BEFORE UPDATE ON water_logs FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER recipes_server_seq BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER recipe_ingredients_server_seq BEFORE UPDATE ON recipe_ingredients FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER meal_templates_server_seq BEFORE UPDATE ON meal_templates FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER meal_template_items_server_seq BEFORE UPDATE ON meal_template_items FOR EACH ROW EXECUTE FUNCTION bump_server_seq();--> statement-breakpoint
CREATE TRIGGER measurements_server_seq BEFORE UPDATE ON measurements FOR EACH ROW EXECUTE FUNCTION bump_server_seq();
