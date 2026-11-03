import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';

import { foods } from './foods';
import { mealTypeEnum } from './meal-type';
import { syncColumns } from './sync';

function grams(name: string) {
  return numeric(name, { precision: 6, scale: 2, mode: 'number' });
}

// Recipes and meal templates (spec section 4); their screens arrive in S6.
export const recipes = pgTable(
  'recipes',
  {
    ...syncColumns(),
    name: text('name').notNull(),
    category: text('category'),
    servings: numeric('servings', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    /** Weight of the whole cooked dish, to log a weighed portion. */
    cookedWeightG: grams('cooked_weight_g'),
    notes: text('notes'),
  },
  (table) => [
    index('recipes_user_id_idx').on(table.userId),
    index('recipes_server_seq_idx').on(table.serverSeq),
    check('recipes_servings_check', sql`${table.servings} > 0`),
  ],
);

export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    ...syncColumns(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id),
    grams: grams('grams').notNull(),
    isRaw: boolean('is_raw').notNull().default(true),
    position: smallint('position').notNull(),
  },
  (table) => [
    index('recipe_ingredients_recipe_id_idx').on(table.recipeId),
    index('recipe_ingredients_server_seq_idx').on(table.serverSeq),
    check('recipe_ingredients_grams_check', sql`${table.grams} > 0`),
  ],
);

export const mealTemplates = pgTable(
  'meal_templates',
  {
    ...syncColumns(),
    name: text('name').notNull(),
    mealType: mealTypeEnum('meal_type'),
  },
  (table) => [
    index('meal_templates_user_id_idx').on(table.userId),
    index('meal_templates_server_seq_idx').on(table.serverSeq),
  ],
);

/** A food or a recipe of a template, exactly one of the two. */
export const mealTemplateItems = pgTable(
  'meal_template_items',
  {
    ...syncColumns(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => mealTemplates.id, { onDelete: 'cascade' }),
    foodId: uuid('food_id').references(() => foods.id),
    recipeId: uuid('recipe_id').references(() => recipes.id),
    grams: grams('grams').notNull(),
    position: smallint('position').notNull(),
  },
  (table) => [
    index('meal_template_items_template_id_idx').on(table.templateId),
    index('meal_template_items_server_seq_idx').on(table.serverSeq),
    check(
      'meal_template_items_target_check',
      sql`num_nonnulls(${table.foodId}, ${table.recipeId}) = 1`,
    ),
    check('meal_template_items_grams_check', sql`${table.grams} > 0`),
  ],
);
