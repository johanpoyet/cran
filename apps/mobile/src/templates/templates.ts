import { type Food, type MealType, nutritionFor, recipePortion } from '@cran/shared';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { toFood } from '../foods/local-food';
import { addEntries, type Entry, type EntryToAdd } from '../journal';
import { readRecipes } from '../recipes';

export const TEMPLATE_NAME_MAX = 100;

export interface MealTemplate {
  id: string;
  name: string;
  /** Meal it was saved from: its templates come first in the add sheet for that meal. */
  mealType: MealType | null;
  /**
   * Foods and recipes with their quantity, as they are now. An item whose food or recipe is gone
   * (or a weighed recipe that lost its cooked weight) is left out.
   */
  items: EntryToAdd[];
  /** Calories of the items, with the current values of the foods and recipes. */
  kcal: number;
}

function own(userId: string, id: string) {
  return and(eq(schema.mealTemplates.id, id), eq(schema.mealTemplates.userId, userId));
}

function itemKcal(item: EntryToAdd): number {
  if ('food' in item) return nutritionFor(item.food, item.grams).kcal;
  return recipePortion(item.recipe, item.amount)?.values.kcal ?? 0;
}

/** The user's meal templates, the latest first, with their foods and recipes (works offline). */
export function readTemplates(db: LocalDatabase, userId: string): MealTemplate[] {
  const templates = db
    .select()
    .from(schema.mealTemplates)
    .where(and(eq(schema.mealTemplates.userId, userId), isNull(schema.mealTemplates.deletedAt)))
    .orderBy(desc(schema.mealTemplates.createdAt))
    .all();
  if (templates.length === 0) return [];
  const rows = db
    .select()
    .from(schema.mealTemplateItems)
    .where(
      and(
        inArray(
          schema.mealTemplateItems.templateId,
          templates.map(({ id }) => id),
        ),
        isNull(schema.mealTemplateItems.deletedAt),
      ),
    )
    .orderBy(asc(schema.mealTemplateItems.position))
    .all();
  const foodIds = [...new Set(rows.flatMap(({ foodId }) => (foodId ? [foodId] : [])))];
  const foods = new Map<string, Food>(
    foodIds.length === 0
      ? []
      : db
          .select()
          .from(schema.foods)
          .where(and(inArray(schema.foods.id, foodIds), isNull(schema.foods.deletedAt)))
          .all()
          .map((row) => [row.id, toFood(row)]),
  );
  const recipes = new Map(readRecipes(db, userId).map((recipe) => [recipe.id, recipe]));

  return templates.map((template) => {
    const items = rows.flatMap((row): EntryToAdd[] => {
      if (row.templateId !== template.id) return [];
      const food = row.foodId ? foods.get(row.foodId) : undefined;
      if (food && row.grams !== null) return [{ food, grams: row.grams }];
      const recipe = row.recipeId ? recipes.get(row.recipeId) : undefined;
      if (!recipe) return [];
      const amount =
        row.servings !== null
          ? { servings: row.servings }
          : row.grams !== null
            ? { grams: row.grams }
            : null;
      return amount && recipePortion(recipe, amount) ? [{ recipe, amount }] : [];
    });
    return {
      id: template.id,
      name: template.name,
      mealType: template.mealType,
      items,
      kcal: items.reduce((total, item) => total + itemKcal(item), 0),
    };
  });
}

/**
 * Saves the entries of a meal as a template: each food with its grams, each recipe with its
 * servings or its weighed portion. Quick adds (calories only) are left out. Returns the id of the
 * template and how many entries it holds, or null when no entry can be kept.
 */
export function saveTemplate(
  db: LocalDatabase,
  userId: string,
  { name, mealType, entries }: { name: string; mealType: MealType; entries: readonly Entry[] },
): { id: string; count: number } | null {
  const kept = entries.filter(
    (entry) => (entry.foodId !== null && entry.grams !== null) || entry.recipeId !== null,
  );
  if (kept.length === 0) return null;
  const id = newId();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(schema.mealTemplates)
      .values({
        id,
        userId,
        name: name.trim().slice(0, TEMPLATE_NAME_MAX),
        mealType,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    kept.forEach((entry, position) => {
      tx.insert(schema.mealTemplateItems)
        .values({
          id: newId(),
          userId,
          templateId: id,
          foodId: entry.foodId,
          recipeId: entry.foodId === null ? entry.recipeId : null,
          // A recipe logged in servings keeps its servings, anything else its grams.
          grams: entry.foodId === null && entry.servings !== null ? null : entry.grams,
          servings: entry.foodId === null ? entry.servings : null,
          position,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  });
  notifyLocalChange();
  return { id, count: kept.length };
}

/** Adds the foods and recipes of a template to a meal of the day of `at`. */
export function applyTemplate(
  db: LocalDatabase,
  userId: string,
  template: MealTemplate,
  { mealType, at }: { mealType: MealType; at: Date },
): void {
  addEntries(db, userId, { mealType, items: template.items, at });
}

export function renameTemplate(db: LocalDatabase, userId: string, id: string, name: string): void {
  const trimmed = name.trim().slice(0, TEMPLATE_NAME_MAX);
  if (trimmed === '') return;
  db.update(schema.mealTemplates)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(own(userId, id))
    .run();
  notifyLocalChange();
}

/** Soft-deletes a template and its items; the entries already logged stay. */
export function deleteTemplate(db: LocalDatabase, userId: string, id: string): void {
  const now = new Date();
  db.transaction((tx) => {
    tx.update(schema.mealTemplates)
      .set({ deletedAt: now, updatedAt: now })
      .where(own(userId, id))
      .run();
    tx.update(schema.mealTemplateItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.mealTemplateItems.templateId, id),
          eq(schema.mealTemplateItems.userId, userId),
          isNull(schema.mealTemplateItems.deletedAt),
        ),
      )
      .run();
  });
  notifyLocalChange();
}
