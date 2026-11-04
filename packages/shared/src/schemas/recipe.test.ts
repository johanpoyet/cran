import { describe, expect, it } from 'vitest';

import { isRecipeCategory, recipeInputSchema } from './recipe';

const curry = {
  name: '  Poulet riz curry ',
  category: 'meal_prep',
  servings: 4,
  cookedWeightG: 2100,
  notes: '',
  ingredients: [
    { foodId: '0192f0c0-0000-7000-8000-000000000001', grams: 800, isRaw: true },
    { foodId: '0192f0c0-0000-7000-8000-000000000002', grams: 320, isRaw: true },
  ],
};

describe('recipeInputSchema', () => {
  it('trims the name and turns empty notes into null', () => {
    expect(recipeInputSchema.parse(curry)).toEqual({
      ...curry,
      name: 'Poulet riz curry',
      notes: null,
    });
  });

  it.each([
    ['an empty name', { name: ' ' }],
    ['no ingredient', { ingredients: [] }],
    ['0 servings', { servings: 0 }],
    ['half a serving', { servings: 2.5 }],
    ['an unknown category', { category: 'dessert' }],
    ['a cooked weight of 0', { cookedWeightG: 0 }],
    ['an ingredient of 0 g', { ingredients: [{ ...curry.ingredients[0], grams: 0 }] }],
  ])('rejects %s', (_, change) => {
    expect(recipeInputSchema.safeParse({ ...curry, ...change }).success).toBe(false);
  });

  it('accepts a recipe without category nor cooked weight', () => {
    expect(
      recipeInputSchema.safeParse({ ...curry, category: null, cookedWeightG: null }).success,
    ).toBe(true);
  });
});

describe('isRecipeCategory', () => {
  it('knows the fixed categories only', () => {
    expect(isRecipeCategory('snack')).toBe(true);
    expect(isRecipeCategory('dessert')).toBe(false);
    expect(isRecipeCategory(null)).toBe(false);
  });
});
