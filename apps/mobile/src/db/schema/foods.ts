import { FOOD_QUALITY_FLAGS, FOOD_SOURCES } from '@cran/shared';
import { index, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { catalogueColumns, instant, syncColumns } from './columns';

// Foods created by the user and global foods used in the journal (cached to work offline).
export const foods = sqliteTable(
  'foods',
  {
    ...catalogueColumns(),
    source: text('source', { enum: FOOD_SOURCES }).notNull(),
    /** CIQUAL code or EAN; null for user foods. */
    sourceRef: text('source_ref'),
    name: text('name').notNull(),
    brand: text('brand'),
    kcal100g: real('kcal_100g').notNull(),
    protein100g: real('protein_100g').notNull(),
    carbs100g: real('carbs_100g').notNull(),
    fat100g: real('fat_100g').notNull(),
    fiber100g: real('fiber_100g'),
    salt100g: real('salt_100g'),
    defaultPortionG: real('default_portion_g'),
    offSyncedAt: instant('off_synced_at'),
    qualityFlag: text('quality_flag', { enum: FOOD_QUALITY_FLAGS }).notNull().default('ok'),
  },
  (table) => [
    uniqueIndex('foods_source_ref_idx').on(table.source, table.sourceRef),
    index('foods_owner_id_idx').on(table.ownerId),
  ],
);

export const foodPortions = sqliteTable(
  'food_portions',
  {
    ...catalogueColumns(),
    foodId: text('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    grams: real('grams').notNull(),
  },
  (table) => [index('food_portions_food_id_idx').on(table.foodId)],
);

/** A food or a recipe, exactly one of the two. */
export const favorites = sqliteTable(
  'favorites',
  {
    ...syncColumns(),
    foodId: text('food_id'),
    recipeId: text('recipe_id'),
  },
  (table) => [index('favorites_user_id_idx').on(table.userId)],
);
