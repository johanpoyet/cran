CREATE TABLE `pending_changes` (
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`queued_at` integer NOT NULL,
	PRIMARY KEY(`table_name`, `row_id`)
);
