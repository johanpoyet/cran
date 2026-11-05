import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { foods } from './foods';
import { mealTypeEnum } from './meal-type';
import { recipes } from './recipes';
import { syncColumns } from './sync';

/** Nutritional value or quantity (spec section 4: numeric 6,2). */
function amount(name: string) {
  return numeric(name, { precision: 6, scale: 2, mode: 'number' });
}

// Journal entries (spec section 4). The values are copied when the entry is made: editing or
// deleting the food never rewrites the history. Quick add = no food or recipe, a label.
export const logEntries = pgTable(
  'log_entries',
  {
    ...syncColumns(),
    /** Local day of the device, "YYYY-MM-DD". */
    date: date('date', { mode: 'string' }).notNull(),
    mealType: mealTypeEnum('meal_type').notNull(),
    foodId: uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
    recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    label: text('label').notNull(),
    /** Null for a quick add. */
    grams: amount('grams'),
    portionLabel: text('portion_label'),
    /** Servings of a recipe; null for a weighed portion, a food or a quick add (ADR 0006). */
    servings: amount('servings'),
    kcal: amount('kcal').notNull(),
    proteinG: amount('protein_g').notNull(),
    carbsG: amount('carbs_g').notNull(),
    fatG: amount('fat_g').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('log_entries_user_date_idx').on(table.userId, table.date),
    index('log_entries_server_seq_idx').on(table.serverSeq),
    check(
      'log_entries_values_check',
      sql`${table.kcal} >= 0 and ${table.proteinG} >= 0 and ${table.carbsG} >= 0 and ${table.fatG} >= 0
        and (${table.grams} is null or ${table.grams} > 0)
        and (${table.servings} is null or ${table.servings} > 0)`,
    ),
  ],
);

/** One row per glass or bottle added (spec section 4). */
export const waterLogs = pgTable(
  'water_logs',
  {
    ...syncColumns(),
    date: date('date', { mode: 'string' }).notNull(),
    ml: integer('ml').notNull(),
  },
  (table) => [
    index('water_logs_user_date_idx').on(table.userId, table.date),
    index('water_logs_server_seq_idx').on(table.serverSeq),
    check('water_logs_ml_check', sql`${table.ml} > 0`),
  ],
);
