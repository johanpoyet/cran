import { foodDetailSchema } from '@cran/shared';
import { sql } from 'drizzle-orm';

import type { LocalDatabase } from '../db/types';
import { cacheGlobalFood } from '../foods/cache';
import { ApiError, apiFetch } from '../lib/api';

/** Foods fetched at most per synchronisation; the others come with the next ones. */
export const MAX_FOODS_PER_SYNC = 100;
const PARALLEL_REQUESTS = 4;

/**
 * Foods used on the phone (journal, favourites, recipes, templates) but missing from its catalogue:
 * global foods, never synchronised, used on another device or before signing in again.
 */
export function missingFoodIds(db: LocalDatabase, limit = MAX_FOODS_PER_SYNC): string[] {
  return db
    .all<{ id: string }>(
      sql`select distinct used.id as id from (
            select food_id as id from log_entries where food_id is not null and deleted_at is null
            union select food_id from favorites where food_id is not null and deleted_at is null
            union select food_id from recipe_ingredients where deleted_at is null
            union select food_id from meal_template_items where food_id is not null and deleted_at is null
          ) as used
          where not exists (select 1 from foods where foods.id = used.id)
          limit ${limit}`,
    )
    .map(({ id }) => id);
}

/**
 * Copies the missing global foods to the phone (spec S4-4), so that the recents, the favourites
 * and the search work offline on every device. A food the server no longer has is skipped.
 * Returns how many foods were copied.
 */
export async function cacheMissingFoods(db: LocalDatabase): Promise<number> {
  const queue = missingFoodIds(db);
  let cached = 0;
  async function worker(): Promise<void> {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const { food } = await apiFetch(`/v1/foods/${id}`, foodDetailSchema);
        cacheGlobalFood(db, food, new Date());
        cached += 1;
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, () => worker()));
  return cached;
}
