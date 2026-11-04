import { foodCoherence, type NewFood, normalizeBarcode } from '@cran/shared';
import { and, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

/**
 * Saves a food created by the user in the local database, with its named portions and, if asked,
 * as a favourite. Local-first: the synchronisation (S4) sends it to the server later. A food whose
 * calories do not match its macros is saved anyway, marked `incoherent`.
 *
 * `barcode`: the food was created from a scan; it keeps the code so that the next scans find it
 * (ADR 0005). A previous food of the user with the same code gives it up.
 */
export function createFood(
  db: LocalDatabase,
  userId: string,
  food: NewFood,
  options: { favorite: boolean; barcode?: string },
): string {
  const id = newId();
  const barcode = options.barcode ? normalizeBarcode(options.barcode) : null;
  const now = new Date();
  const { coherent } = foodCoherence({
    kcal: food.kcal100g,
    protein: food.protein100g,
    carbs: food.carbs100g,
    fat: food.fat100g,
  });

  db.transaction((tx) => {
    if (barcode) {
      tx.update(schema.foods)
        .set({ sourceRef: null, updatedAt: now })
        .where(
          and(
            eq(schema.foods.ownerId, userId),
            eq(schema.foods.source, 'user'),
            eq(schema.foods.sourceRef, barcode),
            isNull(schema.foods.deletedAt),
          ),
        )
        .run();
    }
    tx.insert(schema.foods)
      .values({
        id,
        ownerId: userId,
        source: 'user',
        sourceRef: barcode,
        name: food.name,
        brand: food.brand,
        kcal100g: food.kcal100g,
        protein100g: food.protein100g,
        carbs100g: food.carbs100g,
        fat100g: food.fat100g,
        qualityFlag: coherent ? 'ok' : 'incoherent',
      })
      .run();
    for (const portion of food.portions) {
      tx.insert(schema.foodPortions)
        .values({
          id: newId(),
          ownerId: userId,
          foodId: id,
          label: portion.label,
          grams: portion.grams,
        })
        .run();
    }
    if (options.favorite) {
      tx.insert(schema.favorites).values({ id: newId(), userId, foodId: id }).run();
    }
  });
  notifyLocalChange();
  return id;
}
