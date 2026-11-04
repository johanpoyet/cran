import { randomInt } from 'node:crypto';

import type { OffLookup, OpenFoodFacts } from './client';
import type { OffProduct } from './normalize';

/** Nutella 400 g as Open Food Facts sends it (fields of OFF_FIELDS, trimmed). */
export const nutella: OffProduct = {
  product_name_fr: 'Nutella',
  product_name: 'Nutella',
  brands: 'Nutella, Ferrero',
  nutriments: {
    'energy-kcal_100g': 539,
    'energy-kj_100g': 2252,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    fiber_100g: 0,
    salt_100g: 0.107,
    sodium_100g: 0.0428,
  },
};

/** Gerblé Sésame: a serving of one biscuit (10 g). */
export const sesame: OffProduct = {
  product_name_fr: 'Sésame',
  brands: 'Gerblé',
  serving_quantity: 10,
  nutriments: {
    'energy-kcal_100g': 467,
    proteins_100g: 10,
    carbohydrates_100g: 64,
    fat_100g: 18,
    fiber_100g: 4.6,
    salt_100g: 0.38,
  },
};

/**
 * A valid EAN-13 unique to the test run (prefix 2, reserved for in-store codes): the CI database is
 * shared by the test files.
 */
export function uniqueEan(): string {
  const body = `2${String(randomInt(0, 1e11)).padStart(11, '0')}`;
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return `${body}${String((10 - (sum % 10)) % 10)}`;
}

/** Fake Open Food Facts: products by EAN, `unavailable` when switched off; records every call. */
export function fakeOpenFoodFacts() {
  const products = new Map<string, OffProduct>();
  const calls: string[] = [];
  let available = true;
  const client: OpenFoodFacts = {
    product: (ean) => {
      calls.push(ean);
      const product = products.get(ean);
      const answer: OffLookup = !available
        ? { status: 'unavailable' }
        : product
          ? { status: 'found', product }
          : { status: 'not_found' };
      return Promise.resolve(answer);
    },
  };
  return {
    client,
    calls,
    /** `null`: Open Food Facts no longer knows the product. */
    set: (ean: string, product: OffProduct | null) => {
      if (product) products.set(ean, product);
      else products.delete(ean);
    },
    setAvailable: (value: boolean) => {
      available = value;
    },
  };
}

/** A copy of the product without some nutriments. */
export function withoutNutriments(product: OffProduct, ...keys: string[]): OffProduct {
  const nutriments = Object.fromEntries(
    Object.entries(product.nutriments ?? {}).filter(([key]) => !keys.includes(key)),
  );
  return { ...product, nutriments };
}
