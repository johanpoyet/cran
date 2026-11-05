import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { searchable } from '../foods/local-food';
import { readRecipes, type RecipeDetail } from './recipes';

const RECENT_ENTRIES_SCANNED = 300;

/** Recipes of the latest entries, most recent first, each once (add sheet, "Récents"). */
export function readRecentRecipes(
  db: LocalDatabase,
  userId: string,
  limit: number,
): RecipeDetail[] {
  const entries = db
    .select({ recipeId: schema.logEntries.recipeId })
    .from(schema.logEntries)
    .where(
      and(
        eq(schema.logEntries.userId, userId),
        isNull(schema.logEntries.deletedAt),
        isNotNull(schema.logEntries.recipeId),
      ),
    )
    .orderBy(desc(schema.logEntries.loggedAt))
    .limit(RECENT_ENTRIES_SCANNED)
    .all();
  const ids = [...new Set(entries.flatMap(({ recipeId }) => (recipeId ? [recipeId] : [])))];
  if (ids.length === 0) return [];
  // A deleted recipe is no longer offered.
  const recipes = new Map(readRecipes(db, userId).map((recipe) => [recipe.id, recipe]));
  return ids
    .flatMap((id) => {
      const recipe = recipes.get(id);
      return recipe ? [recipe] : [];
    })
    .slice(0, limit);
}

/** Recipes whose name holds every word of the query, accents and case ignored. */
export function searchRecipes<T extends { name: string }>(
  recipes: readonly T[],
  query: string,
): T[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  return recipes.filter((recipe) => words.every((word) => searchable(recipe.name).includes(word)));
}
