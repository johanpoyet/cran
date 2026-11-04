import { describe, expect, it } from 'vitest';

import {
  barcodeParamsSchema,
  FOOD_SEARCH_LIMITS,
  foodSearchQuerySchema,
  newFoodSchema,
  quickEntrySchema,
} from './food';

describe('foodSearchQuerySchema', () => {
  it('trims the query and applies the default limit', () => {
    expect(foodSearchQuerySchema.parse({ q: '  riz ' })).toEqual({
      q: 'riz',
      limit: FOOD_SEARCH_LIMITS.defaultLimit,
    });
  });

  it('reads the limit from the query string', () => {
    expect(foodSearchQuerySchema.parse({ q: 'riz', limit: '5' }).limit).toBe(5);
  });

  it.each([
    ['an empty query', { q: '   ' }],
    ['a query that is too long', { q: 'a'.repeat(FOOD_SEARCH_LIMITS.queryMax + 1) }],
    ['a limit of 0', { q: 'riz', limit: '0' }],
    ['a limit above the maximum', { q: 'riz', limit: String(FOOD_SEARCH_LIMITS.maxLimit + 1) }],
    ['a decimal limit', { q: 'riz', limit: '2.5' }],
  ])('rejects %s', (_, query) => {
    expect(foodSearchQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('newFoodSchema', () => {
  const galette = {
    name: '  Galette de sarrasin ',
    brand: '',
    kcal100g: 162,
    protein100g: 6,
    carbs100g: 30,
    fat100g: 2,
    portions: [{ label: '1 galette', grams: 50 }],
  };

  it('trims the name and turns an empty brand into null', () => {
    expect(newFoodSchema.parse(galette)).toMatchObject({
      name: 'Galette de sarrasin',
      brand: null,
    });
  });

  it.each([
    ['an empty name', { name: '  ' }],
    ['more than 900 kcal', { kcal100g: 901 }],
    ['a negative macro', { fat100g: -1 }],
    ['more than 100 g of macros', { protein100g: 40, carbs100g: 50, fat100g: 11 }],
    ['a portion of 0 g', { portions: [{ label: '1 galette', grams: 0 }] }],
    ['a portion without a name', { portions: [{ label: ' ', grams: 50 }] }],
  ])('rejects %s', (_, change) => {
    expect(newFoodSchema.safeParse({ ...galette, ...change }).success).toBe(false);
  });

  it('accepts exactly 100 g of macros', () => {
    expect(
      newFoodSchema.safeParse({ ...galette, protein100g: 0, carbs100g: 0, fat100g: 100 }).success,
    ).toBe(true);
  });
});

describe('quickEntrySchema', () => {
  const quick = { label: ' Resto ', kcal: 850, proteinG: 0, carbsG: 0, fatG: 0 };

  it('accepts calories alone, the macros being 0', () => {
    expect(quickEntrySchema.parse(quick)).toEqual({ ...quick, label: 'Resto' });
  });

  it.each([
    ['0 kcal', { kcal: 0 }],
    ['more than 9 999 kcal', { kcal: 10_000 }],
    ['a negative macro', { fatG: -1 }],
    ['a label of more than 100 characters', { label: 'a'.repeat(101) }],
  ])('rejects %s', (_, change) => {
    expect(quickEntrySchema.safeParse({ ...quick, ...change }).success).toBe(false);
  });
});

describe('barcodeParamsSchema', () => {
  it('accepts a valid EAN-13', () => {
    expect(barcodeParamsSchema.parse({ ean: '3017620422003' })).toEqual({ ean: '3017620422003' });
  });

  it('rejects a wrong check digit', () => {
    expect(barcodeParamsSchema.safeParse({ ean: '3017620422004' }).success).toBe(false);
  });
});
