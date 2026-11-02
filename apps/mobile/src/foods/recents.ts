import type { Food } from '@cran/shared';
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { toFood } from './local-food';

export interface RecentFood {
  food: Food;
  /** Quantity of the last entry with this food, preselected when it is added again. */
  lastGrams: number | null;
}

const RECENT_ENTRIES_SCANNED = 300;

function foodsById(db: LocalDatabase, ids: string[]): Map<string, Food> {
  if (ids.length === 0) return new Map();
  const rows = db
    .select()
    .from(schema.foods)
    .where(and(inArray(schema.foods.id, ids), isNull(schema.foods.deletedAt)))
    .all();
  return new Map(rows.map((row) => [row.id, toFood(row)]));
}

/** Last quantity logged for each food, from the latest entries. */
export function readLastGrams(db: LocalDatabase, userId: string): Map<string, number> {
  const entries = db
    .select({ foodId: schema.logEntries.foodId, grams: schema.logEntries.grams })
    .from(schema.logEntries)
    .where(
      and(
        eq(schema.logEntries.userId, userId),
        isNull(schema.logEntries.deletedAt),
        isNotNull(schema.logEntries.foodId),
      ),
    )
    .orderBy(desc(schema.logEntries.loggedAt))
    .limit(RECENT_ENTRIES_SCANNED)
    .all();
  const lastGrams = new Map<string, number>();
  for (const { foodId, grams } of entries) {
    if (foodId && grams !== null && !lastGrams.has(foodId)) lastGrams.set(foodId, grams);
  }
  return lastGrams;
}

/** Foods of the latest entries, most recent first, each once ("Récents" tab). */
export function readRecentFoods(db: LocalDatabase, userId: string, limit: number): RecentFood[] {
  const lastGrams = readLastGrams(db, userId);
  const ids = [...lastGrams.keys()].slice(0, limit);
  const foods = foodsById(db, ids);
  return ids.flatMap((id) => {
    const food = foods.get(id);
    return food ? [{ food, lastGrams: lastGrams.get(id) ?? null }] : [];
  });
}

/** Favourite foods, most recently starred first ("Favoris" tab). */
export function readFavoriteFoods(db: LocalDatabase, userId: string): RecentFood[] {
  const favorites = db
    .select({ foodId: schema.favorites.foodId })
    .from(schema.favorites)
    .where(
      and(
        eq(schema.favorites.userId, userId),
        isNull(schema.favorites.deletedAt),
        isNotNull(schema.favorites.foodId),
      ),
    )
    .orderBy(desc(schema.favorites.createdAt))
    .all();
  // The same food starred twice (two offline devices) is shown once.
  const ids = [...new Set(favorites.flatMap(({ foodId }) => (foodId ? [foodId] : [])))];
  const foods = foodsById(db, ids);
  const lastGrams = readLastGrams(db, userId);
  return ids.flatMap((id) => {
    const food = foods.get(id);
    return food ? [{ food, lastGrams: lastGrams.get(id) ?? null }] : [];
  });
}

/** Quantity preselected when a food is added: the last one used, its usual portion, or 100 g. */
export function defaultGrams(food: Food, lastGrams: number | null | undefined): number {
  return lastGrams ?? food.defaultPortionG ?? 100;
}
