import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { createLocalDatabase } from '../test/local-database';
import { readCachedProduct, readOwnBarcodeFood } from './own-barcode';

const userId = '0192f0c0-0000-7000-8000-00000000a11c';
const otherId = '0192f0c0-0000-7000-8000-0000000b0b00';
const values = { kcal100g: 63, protein100g: 11, carbs100g: 4, fat100g: 0.2 };

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
  db.insert(schema.foods)
    .values([
      {
        ...values,
        id: '0192f0c0-0000-7000-8000-000000000001',
        ownerId: userId,
        source: 'user',
        sourceRef: '0036000291452',
        name: 'Mon skyr',
      },
      {
        ...values,
        id: '0192f0c0-0000-7000-8000-000000000002',
        ownerId: otherId,
        source: 'user',
        sourceRef: '3017620422003',
        name: 'Skyr de quelqu’un d’autre',
      },
      {
        ...values,
        id: '0192f0c0-0000-7000-8000-000000000003',
        ownerId: userId,
        source: 'user',
        sourceRef: '3175680011480',
        name: 'Supprimé',
        deletedAt: new Date(),
      },
      {
        ...values,
        id: '0192f0c0-0000-7000-8000-000000000004',
        ownerId: null,
        source: 'off',
        sourceRef: '3228857000166',
        name: 'Produit Open Food Facts',
      },
    ])
    .run();
  db.insert(schema.foodPortions)
    .values({
      id: '0192f0c0-0000-7000-8000-000000000005',
      ownerId: userId,
      foodId: '0192f0c0-0000-7000-8000-000000000001',
      label: '1 pot',
      grams: 150,
    })
    .run();
});

describe('readOwnBarcodeFood', () => {
  it("finds the user's food from its barcode, scanned as a UPC-A, with its portions", () => {
    expect(readOwnBarcodeFood(db, userId, '036000291452')).toEqual({
      food: expect.objectContaining({ name: 'Mon skyr', source: 'user' }) as object,
      portions: [{ label: '1 pot', grams: 150 }],
    });
  });

  it.each([
    ["another user's food", '3017620422003'],
    ['a deleted food', '3175680011480'],
    ['a product of the catalogue', '3228857000166'],
    ['an unknown code', '3000000000090'],
  ])('ignores %s', (_, ean) => {
    expect(readOwnBarcodeFood(db, userId, ean)).toBeNull();
  });
});

describe('readCachedProduct', () => {
  it('finds a product of Open Food Facts copied on the phone', () => {
    expect(readCachedProduct(db, userId, '3228857000166')).toEqual({
      food: expect.objectContaining({ name: 'Produit Open Food Facts', source: 'off' }) as object,
      portions: [],
    });
  });

  it.each([
    ["the user's own food", '0036000291452'],
    ['an unknown code', '3000000000090'],
  ])('ignores %s', (_, ean) => {
    expect(readCachedProduct(db, userId, ean)).toBeNull();
  });
});
