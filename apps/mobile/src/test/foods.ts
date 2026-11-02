import type { Food } from '@cran/shared';

/** Foods of the "Ajouter un aliment" mockup, in the shape of the API. */
export function food(overrides: Partial<Food> & Pick<Food, 'id' | 'name'>): Food {
  return {
    source: 'ciqual',
    sourceRef: overrides.id,
    brand: null,
    kcal100g: 130,
    protein100g: 2.7,
    carbs100g: 28,
    fat100g: 0.4,
    fiber100g: null,
    salt100g: null,
    defaultPortionG: null,
    qualityFlag: 'ok',
    ...overrides,
  };
}

export const basmati = food({
  id: '0192f0c0-0000-7000-8000-0000000b4511',
  name: 'Riz basmati cuit',
});
export const complet = food({
  id: '0192f0c0-0000-7000-8000-00000000c0b1',
  name: 'Riz complet cuit',
  kcal100g: 112,
  protein100g: 2.6,
  carbs100g: 23,
});
export const galettes = food({
  id: '0192f0c0-0000-7000-8000-0000000a1e70',
  name: 'Galettes de riz',
  kcal100g: 387,
  protein100g: 8,
  carbs100g: 81,
});
