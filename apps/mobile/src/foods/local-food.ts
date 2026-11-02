import type { Food } from '@cran/shared';

import type * as schema from '../db/schema';

type FoodRow = typeof schema.foods.$inferSelect;

/** A food of the local database in the shape of the API (the screens show both the same way). */
export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.sourceRef,
    name: row.name,
    brand: row.brand,
    kcal100g: row.kcal100g,
    protein100g: row.protein100g,
    carbs100g: row.carbs100g,
    fat100g: row.fat100g,
    fiber100g: row.fiber100g,
    salt100g: row.salt100g,
    defaultPortionG: row.defaultPortionG,
    qualityFlag: row.qualityFlag,
  };
}

/** Lower case, without accents or ligatures: "Œuf brûlé" → "oeuf brule". */
export function searchable(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}
