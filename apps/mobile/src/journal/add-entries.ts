import { type Food, localDateKey, type MealType, nutritionFor } from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { cacheGlobalFood } from '../foods/cache';

export interface EntryToAdd {
  food: Food;
  grams: number;
  /** Named portion chosen in the quantity sheet ("1 galette"), kept with the entry. */
  portionLabel?: string | null;
}

/**
 * Adds the selected foods to a meal of the journal, in one transaction. The nutritional values are
 * copied into the entry: editing the food later never rewrites the history. A global food (CIQUAL,
 * Open Food Facts) is copied into the local catalogue, so that it stays usable offline.
 */
export function addEntries(
  db: LocalDatabase,
  userId: string,
  { mealType, items, at }: { mealType: MealType; items: EntryToAdd[]; at: Date },
): void {
  const date = localDateKey(at);
  db.transaction((tx) => {
    for (const { food, grams, portionLabel = null } of items) {
      cacheGlobalFood(tx, food, at);
      tx.insert(schema.logEntries)
        .values({
          id: newId(),
          userId,
          date,
          mealType,
          foodId: food.id,
          label: food.brand ? `${food.name} (${food.brand})` : food.name,
          grams,
          portionLabel,
          ...nutritionFor(food, grams),
          loggedAt: at,
          createdAt: at,
          updatedAt: at,
        })
        .run();
    }
  });
  notifyLocalChange();
}
