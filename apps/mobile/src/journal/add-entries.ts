import {
  type Food,
  localDateKey,
  type MealType,
  nutritionFor,
  type RecipeAmount,
  type RecipeNutrition,
  recipePortion,
} from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { cacheGlobalFood } from '../foods/cache';

export interface FoodToAdd {
  food: Food;
  grams: number;
  /** Named portion chosen in the quantity sheet ("1 galette"), kept with the entry. */
  portionLabel?: string | null;
}

/** What the journal needs of a recipe to log a portion of it. */
export type LoggableRecipe = RecipeNutrition & {
  id: string;
  name: string;
  cookedWeightG: number | null;
};

export interface RecipeToAdd {
  recipe: LoggableRecipe;
  /** Servings, or a weighed portion of the cooked dish (S6-2). */
  amount: RecipeAmount;
}

export type EntryToAdd = FoodToAdd | RecipeToAdd;

/** Values and quantity of an entry to add. */
function entryValues(item: EntryToAdd) {
  if ('food' in item) {
    const { food, grams, portionLabel = null } = item;
    return {
      foodId: food.id,
      recipeId: null,
      label: food.brand ? `${food.name} (${food.brand})` : food.name,
      grams,
      portionLabel,
      servings: null,
      ...nutritionFor(food, grams),
    };
  }
  const { recipe, amount } = item;
  const portion = recipePortion(recipe, amount);
  if (!portion) throw new Error('A weighed portion needs the cooked weight of the recipe');
  return {
    foodId: null,
    recipeId: recipe.id,
    label: recipe.name,
    grams: portion.grams,
    portionLabel: null,
    servings: portion.servings,
    ...portion.values,
  };
}

/**
 * Adds the selected foods and recipes to a meal of the journal, in one transaction. The nutritional
 * values are copied into the entry: editing the food or the recipe later never rewrites the history.
 * A global food (CIQUAL, Open Food Facts) is copied into the local catalogue, so that it stays
 * usable offline.
 */
export function addEntries(
  db: LocalDatabase,
  userId: string,
  { mealType, items, at }: { mealType: MealType; items: EntryToAdd[]; at: Date },
): void {
  const date = localDateKey(at);
  db.transaction((tx) => {
    for (const item of items) {
      if ('food' in item) cacheGlobalFood(tx, item.food, at);
      tx.insert(schema.logEntries)
        .values({
          id: newId(),
          userId,
          date,
          mealType,
          ...entryValues(item),
          loggedAt: at,
          createdAt: at,
          updatedAt: at,
        })
        .run();
    }
  });
  notifyLocalChange();
}
