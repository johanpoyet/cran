import {
  type Food,
  isRecipeCategory,
  type NutritionValues,
  type RecipeCategory,
  type RecipeInput,
  recipeNutrition,
} from '@cran/shared';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { cacheGlobalFood } from '../foods/cache';
import { toFood } from '../foods/local-food';

export interface RecipeIngredient {
  id: string;
  food: Food;
  grams: number;
  isRaw: boolean;
  /** Values of this quantity. */
  values: NutritionValues;
}

export interface RecipeSummary {
  id: string;
  name: string;
  category: RecipeCategory | null;
  servings: number;
  cookedWeightG: number | null;
  ingredientCount: number;
  perServing: NutritionValues;
  /** Weight of one serving of the cooked dish; null without a cooked weight. */
  servingWeightG: number | null;
}

export interface RecipeDetail extends RecipeSummary {
  notes: string | null;
  ingredients: RecipeIngredient[];
  total: NutritionValues;
}

type RecipeRow = typeof schema.recipes.$inferSelect;

/**
 * Live ingredients of the recipes, with their food. An ingredient whose food is not on the phone yet
 * (another device, before the food cache of the sync) is left out until it arrives.
 */
function readIngredients(db: LocalDatabase, recipeIds: string[]): Map<string, RecipeIngredient[]> {
  const byRecipe = new Map<string, RecipeIngredient[]>();
  if (recipeIds.length === 0) return byRecipe;
  const rows = db
    .select({ ingredient: schema.recipeIngredients, food: schema.foods })
    .from(schema.recipeIngredients)
    .innerJoin(schema.foods, eq(schema.foods.id, schema.recipeIngredients.foodId))
    .where(
      and(
        inArray(schema.recipeIngredients.recipeId, recipeIds),
        isNull(schema.recipeIngredients.deletedAt),
      ),
    )
    .orderBy(asc(schema.recipeIngredients.position))
    .all();
  for (const { ingredient, food } of rows) {
    const values = recipeNutrition([{ food, grams: ingredient.grams }], 1, null).total;
    const list = byRecipe.get(ingredient.recipeId) ?? [];
    list.push({
      id: ingredient.id,
      food: toFood(food),
      grams: ingredient.grams,
      isRaw: ingredient.isRaw,
      values,
    });
    byRecipe.set(ingredient.recipeId, list);
  }
  return byRecipe;
}

function toDetail(row: RecipeRow, ingredients: RecipeIngredient[]): RecipeDetail {
  const { total, perServing, servingWeightG } = recipeNutrition(
    ingredients.map(({ food, grams }) => ({ food, grams })),
    row.servings,
    row.cookedWeightG,
  );
  return {
    id: row.id,
    name: row.name,
    category: isRecipeCategory(row.category) ? row.category : null,
    servings: row.servings,
    cookedWeightG: row.cookedWeightG,
    notes: row.notes,
    ingredientCount: ingredients.length,
    ingredients,
    total,
    perServing,
    servingWeightG,
  };
}

/** The user's recipes, by name, with their values per serving (works offline). */
export function readRecipes(db: LocalDatabase, userId: string): RecipeDetail[] {
  const rows = db
    .select()
    .from(schema.recipes)
    .where(and(eq(schema.recipes.userId, userId), isNull(schema.recipes.deletedAt)))
    .all();
  const ingredients = readIngredients(
    db,
    rows.map((row) => row.id),
  );
  return rows
    .map((row) => toDetail(row, ingredients.get(row.id) ?? []))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** One recipe of the user, null if absent or deleted. */
export function readRecipe(db: LocalDatabase, userId: string, id: string): RecipeDetail | null {
  const row = db
    .select()
    .from(schema.recipes)
    .where(
      and(
        eq(schema.recipes.id, id),
        eq(schema.recipes.userId, userId),
        isNull(schema.recipes.deletedAt),
      ),
    )
    .get();
  return row ? toDetail(row, readIngredients(db, [id]).get(id) ?? []) : null;
}

/**
 * Creates a recipe, or replaces the content of an existing one: the previous ingredients are
 * soft-deleted and the list is written again, in order. The global foods used are copied on the
 * phone so that the recipe works offline. Returns the id of the recipe.
 */
export function saveRecipe(
  db: LocalDatabase,
  userId: string,
  input: RecipeInput,
  foods: readonly Food[],
  id?: string,
): string {
  const recipeId = id ?? newId();
  const now = new Date();
  const values = {
    name: input.name,
    category: input.category,
    servings: input.servings,
    cookedWeightG: input.cookedWeightG,
    notes: input.notes,
    updatedAt: now,
  };
  db.transaction((tx) => {
    for (const food of foods) cacheGlobalFood(tx, food, now);
    if (id) {
      tx.update(schema.recipes)
        .set(values)
        .where(and(eq(schema.recipes.id, id), eq(schema.recipes.userId, userId)))
        .run();
      tx.update(schema.recipeIngredients)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(schema.recipeIngredients.recipeId, id),
            eq(schema.recipeIngredients.userId, userId),
            isNull(schema.recipeIngredients.deletedAt),
          ),
        )
        .run();
    } else {
      tx.insert(schema.recipes)
        .values({ id: recipeId, userId, createdAt: now, ...values })
        .run();
    }
    input.ingredients.forEach((ingredient, position) => {
      tx.insert(schema.recipeIngredients)
        .values({
          id: newId(),
          userId,
          recipeId,
          foodId: ingredient.foodId,
          grams: ingredient.grams,
          isRaw: ingredient.isRaw,
          position,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  });
  notifyLocalChange();
  return recipeId;
}

/** Changes one setting of a recipe from its sheet (servings, cooked weight). */
function updateRecipe(
  db: LocalDatabase,
  userId: string,
  id: string,
  changes: Partial<Pick<RecipeRow, 'servings' | 'cookedWeightG'>>,
): void {
  db.update(schema.recipes)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(schema.recipes.id, id), eq(schema.recipes.userId, userId)))
    .run();
  notifyLocalChange();
}

export function setRecipeServings(
  db: LocalDatabase,
  userId: string,
  id: string,
  servings: number,
): void {
  updateRecipe(db, userId, id, { servings });
}

export function setRecipeCookedWeight(
  db: LocalDatabase,
  userId: string,
  id: string,
  cookedWeightG: number | null,
): void {
  updateRecipe(db, userId, id, { cookedWeightG });
}

/** Soft-deletes a recipe and its ingredients; the entries already logged keep their values. */
export function deleteRecipe(db: LocalDatabase, userId: string, id: string): void {
  const now = new Date();
  db.transaction((tx) => {
    tx.update(schema.recipes)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(schema.recipes.id, id), eq(schema.recipes.userId, userId)))
      .run();
    tx.update(schema.recipeIngredients)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(schema.recipeIngredients.recipeId, id), isNull(schema.recipeIngredients.deletedAt)),
      )
      .run();
  });
  notifyLocalChange();
}
