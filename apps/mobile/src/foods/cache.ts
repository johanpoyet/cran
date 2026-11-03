import type { Food } from '@cran/shared';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

/**
 * Copies a global food (CIQUAL, Open Food Facts) into the local catalogue with its server id, or
 * refreshes the copy, so that it stays usable offline (journal, favourites, recents). User foods
 * are already local.
 */
export function cacheGlobalFood(db: LocalDatabase, food: Food, at: Date): void {
  if (food.source === 'user') return;
  const { id, ...values } = food;
  db.insert(schema.foods)
    .values({ id, ownerId: null, ...values })
    .onConflictDoUpdate({ target: schema.foods.id, set: { ...values, updatedAt: at } })
    .run();
}
