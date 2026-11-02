import { foodCoherence, type NewFood } from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

/**
 * Saves a food created by the user in the local database, with its named portions and, if asked,
 * as a favourite. Local-first: the synchronisation (S4) sends it to the server later. A food whose
 * calories do not match its macros is saved anyway, marked `incoherent`.
 */
export function createFood(
  db: LocalDatabase,
  userId: string,
  food: NewFood,
  options: { favorite: boolean },
): string {
  const id = newId();
  const { coherent } = foodCoherence({
    kcal: food.kcal100g,
    protein: food.protein100g,
    carbs: food.carbs100g,
    fat: food.fat100g,
  });

  db.transaction((tx) => {
    tx.insert(schema.foods)
      .values({
        id,
        ownerId: userId,
        source: 'user',
        sourceRef: null,
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
