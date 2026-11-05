import type { Food, RecipeInput } from '@cran/shared';

import { food } from './foods';

// "Poulet riz curry" of mockup 15: values per 100 g as on the mockup.
export const poulet = food({
  id: '0192f0c0-0000-7000-8000-000000000001',
  name: 'Blanc de poulet',
  kcal100g: 120,
  protein100g: 23,
  carbs100g: 0,
  fat100g: 1.5,
});
export const riz = food({
  id: '0192f0c0-0000-7000-8000-000000000002',
  name: 'Riz basmati',
  kcal100g: 350,
  protein100g: 7.5,
  carbs100g: 78,
  fat100g: 0.9,
});
export const brocolis = food({
  id: '0192f0c0-0000-7000-8000-000000000003',
  name: 'Brocolis',
  kcal100g: 34,
  protein100g: 2.8,
  carbs100g: 7,
  fat100g: 0.4,
});
export const coco = food({
  id: '0192f0c0-0000-7000-8000-000000000004',
  name: 'Lait de coco léger',
  kcal100g: 70,
  protein100g: 0.7,
  carbs100g: 2.5,
  fat100g: 6,
});
export const curryPaste = food({
  id: '0192f0c0-0000-7000-8000-000000000005',
  name: 'Pâte de curry',
  kcal100g: 250,
  protein100g: 5,
  carbs100g: 20,
  fat100g: 15,
});
export const foods: Food[] = [poulet, riz, brocolis, coco, curryPaste];

export const curry: RecipeInput = {
  name: 'Poulet riz curry',
  category: 'meal_prep',
  servings: 4,
  cookedWeightG: null,
  notes: null,
  ingredients: [
    { foodId: poulet.id, grams: 800, isRaw: true },
    { foodId: riz.id, grams: 320, isRaw: true },
    { foodId: brocolis.id, grams: 400, isRaw: false },
    { foodId: coco.id, grams: 200, isRaw: false },
    { foodId: curryPaste.id, grams: 40, isRaw: false },
  ],
};
