-- Sync queue (written by hand): every insert or update of a synchronised row queues it, except
-- the rows written by a pull (flag 'applying_pull' in local_meta) and the global foods cached on the
-- phone (no owner). Weekly targets are written by the server only; progress photos never sync.
CREATE TRIGGER `profiles_pending_insert` AFTER INSERT ON `profiles`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('profiles', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `profiles_pending_update` AFTER UPDATE ON `profiles`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('profiles', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `weigh_ins_pending_insert` AFTER INSERT ON `weigh_ins`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('weigh_ins', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `weigh_ins_pending_update` AFTER UPDATE ON `weigh_ins`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('weigh_ins', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `foods_pending_insert` AFTER INSERT ON `foods`
WHEN NEW.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('foods', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `foods_pending_update` AFTER UPDATE ON `foods`
WHEN NEW.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('foods', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `food_portions_pending_insert` AFTER INSERT ON `food_portions`
WHEN NEW.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('food_portions', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `food_portions_pending_update` AFTER UPDATE ON `food_portions`
WHEN NEW.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('food_portions', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `recipes_pending_insert` AFTER INSERT ON `recipes`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('recipes', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `recipes_pending_update` AFTER UPDATE ON `recipes`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('recipes', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `recipe_ingredients_pending_insert` AFTER INSERT ON `recipe_ingredients`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('recipe_ingredients', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `recipe_ingredients_pending_update` AFTER UPDATE ON `recipe_ingredients`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('recipe_ingredients', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `meal_templates_pending_insert` AFTER INSERT ON `meal_templates`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('meal_templates', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `meal_templates_pending_update` AFTER UPDATE ON `meal_templates`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('meal_templates', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
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
--> statement-breakpoint
CREATE TRIGGER `favorites_pending_insert` AFTER INSERT ON `favorites`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('favorites', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `favorites_pending_update` AFTER UPDATE ON `favorites`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('favorites', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_pending_insert` AFTER INSERT ON `log_entries`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('log_entries', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `log_entries_pending_update` AFTER UPDATE ON `log_entries`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('log_entries', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `water_logs_pending_insert` AFTER INSERT ON `water_logs`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('water_logs', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `water_logs_pending_update` AFTER UPDATE ON `water_logs`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('water_logs', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `measurements_pending_insert` AFTER INSERT ON `measurements`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('measurements', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `measurements_pending_update` AFTER UPDATE ON `measurements`
WHEN NOT EXISTS (SELECT 1 FROM local_meta WHERE key = 'applying_pull')
BEGIN
  INSERT INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`)
  VALUES ('measurements', NEW.id, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  ON CONFLICT (`table_name`, `row_id`) DO UPDATE SET `version` = `version` + 1, `queued_at` = excluded.`queued_at`;
END;
--> statement-breakpoint
-- Rows written before the sync existed are queued once, to reach the server.
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'profiles', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `profiles`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'weigh_ins', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `weigh_ins`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'foods', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `foods` WHERE `owner_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'food_portions', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `food_portions` WHERE `owner_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'recipes', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `recipes`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'recipe_ingredients', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `recipe_ingredients`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'meal_templates', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `meal_templates`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'meal_template_items', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `meal_template_items`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'favorites', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `favorites`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'log_entries', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `log_entries`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'water_logs', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `water_logs`;
--> statement-breakpoint
INSERT OR IGNORE INTO `pending_changes` (`table_name`, `row_id`, `version`, `attempts`, `queued_at`) SELECT 'measurements', `id`, 1, 0, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) FROM `measurements`;
