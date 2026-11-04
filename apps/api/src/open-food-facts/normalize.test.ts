import { describe, expect, it } from 'vitest';

import { nutella, sesame, withoutNutriments } from './fixtures';
import { toOffFood } from './normalize';

const ean = '3017620422003';

describe('toOffFood', () => {
  it('normalises a complete product', () => {
    expect(toOffFood(ean, nutella)).toEqual({
      sourceRef: ean,
      name: 'Nutella',
      brand: 'Nutella',
      kcal100g: 539,
      protein100g: 6.3,
      carbs100g: 57.5,
      fat100g: 30.9,
      fiber100g: 0,
      salt100g: 0.11,
      defaultPortionG: null,
      qualityFlag: 'ok',
    });
  });

  it('keeps the serving as the default portion', () => {
    expect(toOffFood(ean, sesame)?.defaultPortionG).toBe(10);
  });

  it('prefers the French name and falls back on the generic one', () => {
    expect(
      toOffFood(ean, { ...nutella, product_name_fr: 'Pâte à tartiner', product_name: 'Spread' })
        ?.name,
    ).toBe('Pâte à tartiner');
    expect(
      toOffFood(ean, { ...nutella, product_name_fr: '  ', product_name: 'Spread' })?.name,
    ).toBe('Spread');
  });

  it('converts kJ to kcal when only kJ is given', () => {
    // 2252 kJ / 4.184 = 538.24 kcal.
    expect(toOffFood(ean, withoutNutriments(nutella, 'energy-kcal_100g'))?.kcal100g).toBe(538.24);
  });

  it('reads numbers sent as strings', () => {
    const food = toOffFood(ean, {
      ...sesame,
      serving_quantity: '25',
      nutriments: { ...sesame.nutriments, proteins_100g: '10.5' },
    });
    expect(food?.protein100g).toBe(10.5);
    expect(food?.defaultPortionG).toBe(25);
  });

  it('stores a missing macro as 0 and marks the product incomplete', () => {
    const food = toOffFood(ean, withoutNutriments(sesame, 'fat_100g'));
    expect(food?.fat100g).toBe(0);
    expect(food?.qualityFlag).toBe('incomplete');
  });

  it('marks the product incoherent when calories are far from the macros', () => {
    const nutriments = { ...sesame.nutriments, 'energy-kcal_100g': 250 };
    expect(toOffFood(ean, { ...sesame, nutriments })?.qualityFlag).toBe('incoherent');
  });

  it.each([
    ['a negative value', -1],
    ['a value too large for the database', 12_000],
    ['text', 'n/a'],
  ])('ignores %s', (_, value) => {
    const food = toOffFood(ean, {
      ...sesame,
      nutriments: { ...sesame.nutriments, fiber_100g: value },
    });
    expect(food?.fiber100g).toBeNull();
  });

  it('ignores an empty serving', () => {
    expect(toOffFood(ean, { ...sesame, serving_quantity: 0 })?.defaultPortionG).toBeNull();
  });

  it('has no brand when Open Food Facts gives none', () => {
    expect(toOffFood(ean, { ...sesame, brands: '' })?.brand).toBeNull();
  });

  it('returns null without a name', () => {
    expect(toOffFood(ean, { ...nutella, product_name_fr: undefined, product_name: '' })).toBeNull();
  });

  it('returns null without energy', () => {
    expect(toOffFood(ean, { ...nutella, nutriments: { proteins_100g: 6 } })).toBeNull();
  });
});
