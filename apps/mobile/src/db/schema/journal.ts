import { MEAL_TYPES } from '@cran/shared';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { day, instant, syncColumns } from './columns';

// Journal entries: nutritional values are copied when the entry is made, so editing a food never
// rewrites the history. Quick add = no food or recipe, a label and calories.
export const logEntries = sqliteTable(
  'log_entries',
  {
    ...syncColumns(),
    date: day('date').notNull(),
    mealType: text('meal_type', { enum: MEAL_TYPES }).notNull(),
    foodId: text('food_id'),
    recipeId: text('recipe_id'),
    label: text('label').notNull(),
    grams: real('grams'),
    portionLabel: text('portion_label'),
    kcal: real('kcal').notNull(),
    proteinG: real('protein_g').notNull(),
    carbsG: real('carbs_g').notNull(),
    fatG: real('fat_g').notNull(),
    loggedAt: instant('logged_at').notNull(),
  },
  (table) => [index('log_entries_user_date_idx').on(table.userId, table.date)],
);

/** One row per glass or bottle added. */
export const waterLogs = sqliteTable(
  'water_logs',
  {
    ...syncColumns(),
    date: day('date').notNull(),
    ml: integer('ml').notNull(),
  },
  (table) => [index('water_logs_user_date_idx').on(table.userId, table.date)],
);
