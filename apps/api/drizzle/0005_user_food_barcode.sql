-- ADR 0005: a user food keeps the barcode it was created from, once per user; the catalogue keeps
-- one food per CIQUAL code or EAN.
DROP INDEX "foods_source_ref_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "foods_owner_barcode_idx" ON "foods" USING btree ("owner_id","source_ref") WHERE "foods"."source" = 'user' and "foods"."source_ref" is not null and "foods"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_ref_idx" ON "foods" USING btree ("source","source_ref") WHERE "foods"."source" <> 'user';