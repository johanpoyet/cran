import type { Food } from '@cran/shared';
import { and, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { cacheGlobalFood } from './cache';

function favoriteOf(userId: string, foodId: string) {
  return and(
    eq(schema.favorites.userId, userId),
    eq(schema.favorites.foodId, foodId),
    isNull(schema.favorites.deletedAt),
  );
}

export function isFavorite(db: LocalDatabase, userId: string, foodId: string): boolean {
  return (
    db
      .select({ id: schema.favorites.id })
      .from(schema.favorites)
      .where(favoriteOf(userId, foodId))
      .get() !== undefined
  );
}

/**
 * Stars or unstars a food. A starred global food is copied to the phone to appear in the
 * "Favoris" tab offline; unstarring deletes every favourite row of the food (soft delete, synced).
 */
export function setFavorite(
  db: LocalDatabase,
  userId: string,
  food: Food,
  favorite: boolean,
): void {
  const now = new Date();
  db.transaction((tx) => {
    if (favorite) {
      if (isFavorite(tx, userId, food.id)) return;
      cacheGlobalFood(tx, food, now);
      tx.insert(schema.favorites)
        .values({ id: newId(), userId, foodId: food.id, createdAt: now, updatedAt: now })
        .run();
    } else {
      tx.update(schema.favorites)
        .set({ deletedAt: now, updatedAt: now })
        .where(favoriteOf(userId, food.id))
        .run();
    }
  });
  notifyLocalChange();
}
