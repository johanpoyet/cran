ALTER TABLE "meal_template_items" DROP CONSTRAINT "meal_template_items_grams_check";--> statement-breakpoint
ALTER TABLE "meal_template_items" ALTER COLUMN "grams" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD COLUMN "servings" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "meal_template_items" ADD CONSTRAINT "meal_template_items_grams_check" CHECK (("meal_template_items"."grams" is null or "meal_template_items"."grams" > 0)
        and ("meal_template_items"."servings" is null or "meal_template_items"."servings" > 0)
        and num_nonnulls("meal_template_items"."grams", "meal_template_items"."servings") >= 1);