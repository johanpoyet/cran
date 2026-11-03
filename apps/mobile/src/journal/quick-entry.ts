import { localDateKey, type MealType, type QuickEntry } from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import type { Entry } from './entries';

/** Quick add (spec section 4): calories without a food, `food_id` null, a label, no quantity. */
export function addQuickEntry(
  db: LocalDatabase,
  userId: string,
  {
    mealType,
    entry,
    label,
    at,
  }: { mealType: MealType; entry: QuickEntry; label: string; at: Date },
): void {
  db.insert(schema.logEntries)
    .values({
      id: newId(),
      userId,
      date: localDateKey(at),
      mealType,
      foodId: null,
      label: entry.label || label,
      grams: null,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      loggedAt: at,
      createdAt: at,
      updatedAt: at,
    })
    .run();
  notifyLocalChange();
}

/** The local day before `date`, "YYYY-MM-DD". */
export function yesterdayKey(date: Date): string {
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
}

/**
 * Copies entries (a meal of yesterday) into a meal of the day of `at`: new entries with the same
 * food, quantity, portion and copied values.
 */
export function copyEntries(
  db: LocalDatabase,
  userId: string,
  entries: readonly Entry[],
  { mealType, at }: { mealType: MealType; at: Date },
): void {
  const date = localDateKey(at);
  db.transaction((tx) => {
    for (const entry of entries) {
      tx.insert(schema.logEntries)
        .values({
          id: newId(),
          userId,
          date,
          mealType,
          foodId: entry.foodId,
          recipeId: entry.recipeId,
          label: entry.label,
          grams: entry.grams,
          portionLabel: entry.portionLabel,
          kcal: entry.kcal,
          proteinG: entry.proteinG,
          carbsG: entry.carbsG,
          fatG: entry.fatG,
          loggedAt: at,
          createdAt: at,
          updatedAt: at,
        })
        .run();
    }
  });
  notifyLocalChange();
}
