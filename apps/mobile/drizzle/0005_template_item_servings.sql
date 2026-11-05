-- Edited by hand (S6-3): SQLite cannot drop NOT NULL, so the table is rebuilt. The copy leaves out
-- `servings` (new column), and the sync triggers dropped with the old table are created again.
CREATE TABLE `__new_meal_template_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`template_id` text NOT NULL,
	`food_id` text,
	`recipe_id` text,
	`grams` real,
	`servings` real,
	`position` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_meal_template_items`("id", "user_id", "created_at", "updated_at", "deleted_at", "template_id", "food_id", "recipe_id", "grams", "position") SELECT "id", "user_id", "created_at", "updated_at", "deleted_at", "template_id", "food_id", "recipe_id", "grams", "position" FROM `meal_template_items`;--> statement-breakpoint
DROP TABLE `meal_template_items`;--> statement-breakpoint
ALTER TABLE `__new_meal_template_items` RENAME TO `meal_template_items`;--> statement-breakpoint
CREATE INDEX `meal_template_items_template_id_idx` ON `meal_template_items` (`template_id`);
--> statement-breakpoint
CREATE TRIGGER `meal_template_items_pending_insert` AFTER INSERT ON `meal_template_items`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('meal_template_items', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `meal_template_items_pending_update` AFTER UPDATE ON `meal_template_items`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('meal_template_items', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
