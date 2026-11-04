import { t } from 'i18next';

import { ingredientDetails } from './labels';

describe('ingredientDetails', () => {
  it.each([
    [{ kcal: 960, proteinG: 184, carbsG: 0, fatG: 12 }, '960 kcal · P 184 g'],
    [{ kcal: 1120, proteinG: 24, carbsG: 249.6, fatG: 2.9 }, '1 120 kcal · G 250 g'],
    [{ kcal: 140, proteinG: 1.4, carbsG: 5, fatG: 12 }, '140 kcal · L 12 g'],
    // Pâte de curry: no macro reaches 10 g.
    [{ kcal: 100, proteinG: 2, carbsG: 8, fatG: 6 }, '100 kcal'],
  ])('shows the calories and the main macro of %j', (values, expected) => {
    expect(ingredientDetails(t, values)).toBe(expected);
  });
});
