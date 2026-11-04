DROP INDEX `foods_source_ref_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `foods_owner_barcode_idx` ON `foods` (`owner_id`,`source_ref`) WHERE "foods"."source" = 'user' and "foods"."source_ref" is not null and "foods"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `foods_source_ref_idx` ON `foods` (`source`,`source_ref`) WHERE "foods"."source" <> 'user';