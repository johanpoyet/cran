import { describe, expect, it } from 'vitest';

import { recipeNutrition, recipePortion, weighedPortion } from './recipe';

// "Poulet riz curry" of the spec (S6-1) and of mockup 15, values per 100 g as on the mockup.
const curry = [
  { food: { kcal100g: 120, protein100g: 23, carbs100g: 0, fat100g: 1.5 }, grams: 800 },
  { food: { kcal100g: 350, protein100g: 7.5, carbs100g: 78, fat100g: 0.9 }, grams: 320 },
  { food: { kcal100g: 34, protein100g: 2.8, carbs100g: 7, fat100g: 0.4 }, grams: 400 },
  { food: { kcal100g: 70, protein100g: 0.7, carbs100g: 2.5, fat100g: 6 }, grams: 200 },
  { food: { kcal100g: 250, protein100g: 5, carbs100g: 20, fat100g: 15 }, grams: 40 },
];

describe('recipeNutrition', () => {
  it('gives about 614 kcal per serving for the "Poulet riz curry" in 4 servings', () => {
    const { total, perServing } = recipeNutrition(curry, 4, null);

    expect(total.kcal).toBeCloseTo(2456, 6);
    expect(Math.round(perServing.kcal)).toBe(614);
    expect(perServing.proteinG).toBeCloseTo(total.proteinG / 4, 10);
  });

  it('gives the weight of a serving of the cooked dish', () => {
    expect(recipeNutrition(curry, 4, 2100).servingWeightG).toBe(525);
  });

  it('has no serving weight without a cooked weight', () => {
    expect(recipeNutrition(curry, 4, null).servingWeightG).toBeNull();
    expect(recipeNutrition(curry, 4, 0).servingWeightG).toBeNull();
  });

  it('is zero without ingredients, and per serving without servings', () => {
    expect(recipeNutrition([], 4, null).total).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(recipeNutrition(curry, 0, 2100)).toEqual(
      expect.objectContaining({
        perServing: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        servingWeightG: null,
      }),
    );
  });
});

describe('weighedPortion', () => {
  it('scales the totals to the weighed grams of the cooked dish', () => {
    const { total } = recipeNutrition(curry, 4, 2100);

    // 525 g of 2 100 g: one serving.
    expect(weighedPortion(total, 2100, 525)?.kcal).toBeCloseTo(614, 6);
    expect(weighedPortion(total, 2100, 300)?.kcal).toBeCloseTo((2456 * 300) / 2100, 6);
  });

  it('needs a cooked weight', () => {
    const { total } = recipeNutrition(curry, 4, null);

    expect(weighedPortion(total, null, 300)).toBeNull();
    expect(weighedPortion(total, 0, 300)).toBeNull();
  });
});

describe('recipePortion', () => {
  const cooked = { ...recipeNutrition(curry, 4, 2100), cookedWeightG: 2100 };
  const uncooked = { ...recipeNutrition(curry, 4, null), cookedWeightG: null };

  it('logs n servings with their weight when the cooked weight is known', () => {
    const portion = recipePortion(cooked, { servings: 2 });

    expect(portion?.servings).toBe(2);
    expect(portion?.grams).toBe(1050);
    expect(Math.round(portion?.values.kcal ?? 0)).toBe(1228);
  });

  it('logs servings without a weight when the cooked weight is unknown', () => {
    const portion = recipePortion(uncooked, { servings: 1.5 });

    expect(portion?.grams).toBeNull();
    expect(portion?.values.proteinG).toBeCloseTo(uncooked.perServing.proteinG * 1.5, 10);
  });

  it('logs a weighed portion of the cooked dish', () => {
    const portion = recipePortion(cooked, { grams: 525 });

    expect(portion).toEqual({ values: cooked.perServing, grams: 525, servings: null });
  });

  it('cannot weigh a portion without a cooked weight', () => {
    expect(recipePortion(uncooked, { grams: 300 })).toBeNull();
  });
});
