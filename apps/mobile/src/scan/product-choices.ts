import type { FoodDetail } from '@cran/shared';

/**
 * Quantities offered for a scanned product: the serving given by Open Food Facts first (the most
 * likely one, preselected), then the user's named portions, then 100 g. "Autre…" is added by the
 * sheet. `label`: portion name kept with the entry, null for a weight.
 */
export type ProductChoice =
  | { kind: 'serving'; grams: number }
  | { kind: 'portion'; label: string; grams: number }
  | { kind: 'hundred'; grams: 100 };

export function productChoices({ food, portions }: FoodDetail): ProductChoice[] {
  return [
    ...(food.defaultPortionG === null
      ? []
      : [{ kind: 'serving' as const, grams: food.defaultPortionG }]),
    ...portions.map((portion) => ({ kind: 'portion' as const, ...portion })),
    { kind: 'hundred', grams: 100 },
  ];
}
