import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { nextServerSeq } from './sync';

export const foodSourceEnum = pgEnum('food_source', ['ciqual', 'off', 'user']);
export const foodQualityEnum = pgEnum('food_quality', ['ok', 'incoherent', 'incomplete']);

/** Nutritional value in g or kcal (spec section 4: numeric 6,2). */
function nutrient(name: string) {
  return numeric(name, { precision: 6, scale: 2, mode: 'number' });
}

/** Conflict target of the catalogue upserts (CIQUAL import, Open Food Facts cache). */
export const CATALOGUE_REF = sql`source <> 'user'`;

/** Accent-free text for the trigram indexes; `f_unaccent` is created by migration 0003. */
export function unaccented(column: AnyPgColumn) {
  return sql`f_unaccent(${column})`;
}

/**
 * Columns of the food catalogue. Global foods (CIQUAL, Open Food Facts) have no owner and stay on
 * the server; foods created by a user are theirs and are synchronised like the other tables.
 */
function catalogueColumns() {
  return {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Null for global foods. */
    ownerId: uuid('owner_id').references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    serverSeq: bigint('server_seq', { mode: 'number' }).notNull().default(nextServerSeq),
  };
}

// Food catalogue (spec section 4): CIQUAL, Open Food Facts cache and user foods, values per 100 g.
export const foods = pgTable(
  'foods',
  {
    ...catalogueColumns(),
    source: foodSourceEnum('source').notNull(),
    /** CIQUAL code or EAN; for a user food, the barcode it was created from, if any (ADR 0005). */
    sourceRef: text('source_ref'),
    name: text('name').notNull(),
    brand: text('brand'),
    /** Missing or "traces" values are stored as 0 with `quality_flag = incomplete`. */
    kcal100g: nutrient('kcal_100g').notNull(),
    protein100g: nutrient('protein_100g').notNull(),
    carbs100g: nutrient('carbs_100g').notNull(),
    fat100g: nutrient('fat_100g').notNull(),
    fiber100g: nutrient('fiber_100g'),
    salt100g: nutrient('salt_100g'),
    defaultPortionG: nutrient('default_portion_g'),
    /** Last refresh from Open Food Facts (30-day cache). */
    offSyncedAt: timestamp('off_synced_at', { withTimezone: true }),
    qualityFlag: foodQualityEnum('quality_flag').notNull().default('ok'),
  },
  (table) => [
    // One catalogue food per CIQUAL code or EAN; a user food keeps the barcode it was created from,
    // once per user, so that the scan finds it first (ADR 0005).
    uniqueIndex('foods_source_ref_idx')
      .on(table.source, table.sourceRef)
      .where(sql`${table.source} <> 'user'`),
    uniqueIndex('foods_owner_barcode_idx')
      .on(table.ownerId, table.sourceRef)
      .where(
        sql`${table.source} = 'user' and ${table.sourceRef} is not null and ${table.deletedAt} is null`,
      ),
    index('foods_owner_id_idx').on(table.ownerId),
    index('foods_server_seq_idx').on(table.serverSeq),
    index('foods_name_trgm_idx').using('gin', sql`${unaccented(table.name)} gin_trgm_ops`),
    index('foods_brand_trgm_idx').using('gin', sql`${unaccented(table.brand)} gin_trgm_ops`),
    check('foods_owner_check', sql`(${table.source} = 'user') = (${table.ownerId} is not null)`),
    check(
      'foods_source_ref_check',
      sql`${table.source} = 'user' or ${table.sourceRef} is not null`,
    ),
    check(
      'foods_nutrients_check',
      sql`${table.kcal100g} >= 0 and ${table.protein100g} >= 0 and ${table.carbs100g} >= 0
        and ${table.fat100g} >= 0 and coalesce(${table.fiber100g}, 0) >= 0
        and coalesce(${table.salt100g}, 0) >= 0`,
    ),
    check(
      'foods_default_portion_check',
      sql`${table.defaultPortionG} is null or ${table.defaultPortionG} > 0`,
    ),
  ],
);

// Named portions ("1 pot" = 125 g). A user can name a portion of a global food too: its owner is the
// user, not the owner of the food.
export const foodPortions = pgTable(
  'food_portions',
  {
    ...catalogueColumns(),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    grams: nutrient('grams').notNull(),
  },
  (table) => [
    index('food_portions_food_id_idx').on(table.foodId),
    index('food_portions_owner_id_idx').on(table.ownerId),
    index('food_portions_server_seq_idx').on(table.serverSeq),
    check('food_portions_grams_check', sql`${table.grams} > 0`),
  ],
);

export type FoodRow = typeof foods.$inferSelect;
export type FoodPortionRow = typeof foodPortions.$inferSelect;
