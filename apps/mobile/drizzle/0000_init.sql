CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`arm_cm` real,
	`chest_cm` real,
	`waist_cm` real,
	`thigh_cm` real
);
--> statement-breakpoint
CREATE INDEX `measurements_user_date_idx` ON `measurements` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`pose` text NOT NULL,
	`local_uri` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_photos_user_date_idx` ON `progress_photos` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `weekly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`week_start` text NOT NULL,
	`maintenance_kcal` integer NOT NULL,
	`target_kcal` integer NOT NULL,
	`protein_g` integer NOT NULL,
	`carbs_g` integer NOT NULL,
	`fat_g` integer NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_targets_user_week_idx` ON `weekly_targets` (`user_id`,`week_start`);--> statement-breakpoint
CREATE TABLE `weigh_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`measured_at` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`source` text NOT NULL,
	`external_id` text
);
--> statement-breakpoint
CREATE INDEX `weigh_ins_user_date_idx` ON `weigh_ins` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`food_id` text,
	`recipe_id` text
);
--> statement-breakpoint
CREATE INDEX `favorites_user_id_idx` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE TABLE `food_portions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`food_id` text NOT NULL,
	`label` text NOT NULL,
	`grams` real NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `food_portions_food_id_idx` ON `food_portions` (`food_id`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`source` text NOT NULL,
	`source_ref` text,
	`name` text NOT NULL,
	`brand` text,
	`kcal_100g` real NOT NULL,
	`protein_100g` real NOT NULL,
	`carbs_100g` real NOT NULL,
	`fat_100g` real NOT NULL,
	`fiber_100g` real,
	`salt_100g` real,
	`default_portion_g` real,
	`off_synced_at` integer,
	`quality_flag` text DEFAULT 'ok' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foods_source_ref_idx` ON `foods` (`source`,`source_ref`);--> statement-breakpoint
CREATE INDEX `foods_owner_id_idx` ON `foods` (`owner_id`);--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`food_id` text,
	`recipe_id` text,
	`label` text NOT NULL,
	`grams` real,
	`portion_label` text,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`logged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `log_entries_user_date_idx` ON `log_entries` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `water_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`ml` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `water_logs_user_date_idx` ON `water_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `local_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sex` text NOT NULL,
	`birth_year` integer NOT NULL,
	`height_cm` integer NOT NULL,
	`activity_level` integer NOT NULL,
	`goal_rate_kg_month` real NOT NULL,
	`protein_g_per_kg` real NOT NULL,
	`fat_g_per_kg` real NOT NULL,
	`training_bonus_kcal` integer NOT NULL,
	`training_days` integer NOT NULL,
	`water_goal_ml` integer NOT NULL,
	`reminders` text NOT NULL,
	`health_data_consent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_idx` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `meal_template_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`template_id` text NOT NULL,
	`food_id` text,
	`recipe_id` text,
	`grams` real NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_template_items_template_id_idx` ON `meal_template_items` (`template_id`);--> statement-breakpoint
CREATE TABLE `meal_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`meal_type` text
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`food_id` text NOT NULL,
	`grams` real NOT NULL,
	`is_raw` integer DEFAULT true NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recipe_ingredients_recipe_id_idx` ON `recipe_ingredients` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`category` text,
	`servings` real NOT NULL,
	`cooked_weight_g` real,
	`notes` text
);
