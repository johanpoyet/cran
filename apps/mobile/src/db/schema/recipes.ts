import { MEAL_TYPES } from '@cran/shared';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';

export const recipes = sqliteTable('recipes', {
  ...syncColumns(),
  name: text('name').notNull(),
  category: text('category'),
  servings: real('servings').notNull(),
  /** Weight of the whole cooked dish, to log a weighed portion. */
  cookedWeightG: real('cooked_weight_g'),
  notes: text('notes'),
});

export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    ...syncColumns(),
    recipeId: text('recipe_id').notNull(),
    foodId: text('food_id').notNull(),
    grams: real('grams').notNull(),
    isRaw: integer('is_raw', { mode: 'boolean' }).notNull().default(true),
    position: integer('position').notNull(),
  },
  (table) => [index('recipe_ingredients_recipe_id_idx').on(table.recipeId)],
);

export const mealTemplates = sqliteTable('meal_templates', {
  ...syncColumns(),
  name: text('name').notNull(),
  mealType: text('meal_type', { enum: MEAL_TYPES }),
});

/** A food or a recipe of a template, in grams or (a recipe) in servings. */
export const mealTemplateItems = sqliteTable(
  'meal_template_items',
  {
    ...syncColumns(),
    templateId: text('template_id').notNull(),
    foodId: text('food_id'),
    recipeId: text('recipe_id'),
    /** Null for servings of a recipe (S6-3, ADR 0006). */
    grams: real('grams'),
    servings: real('servings'),
    position: integer('position').notNull(),
  },
  (table) => [index('meal_template_items_template_id_idx').on(table.templateId)],
);
