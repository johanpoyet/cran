ALTER TABLE "log_entries" DROP CONSTRAINT "log_entries_values_check";--> statement-breakpoint
ALTER TABLE "log_entries" ADD COLUMN "servings" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_values_check" CHECK ("log_entries"."kcal" >= 0 and "log_entries"."protein_g" >= 0 and "log_entries"."carbs_g" >= 0 and "log_entries"."fat_g" >= 0
        and ("log_entries"."grams" is null or "log_entries"."grams" > 0)
        and ("log_entries"."servings" is null or "log_entries"."servings" > 0));