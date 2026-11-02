import { describe, expect, it } from 'vitest';

import { nutritionFor } from './nutrition';

// Riz basmati cuit, as on the "Ajouter un aliment" mockup.
const rice = { kcal100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.4 };

describe('nutritionFor', () => {
  it('scales the values per 100 g to the quantity', () => {
    expect(nutritionFor(rice, 250)).toEqual({ kcal: 325, proteinG: 6.75, carbsG: 70, fatG: 1 });
  });

  it('does not round', () => {
    expect(nutritionFor(rice, 33).kcal).toBeCloseTo(42.9, 10);
  });

  it('is zero for 0 g', () => {
    expect(nutritionFor(rice, 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
