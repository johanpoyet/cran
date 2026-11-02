import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { addEntries } from '../journal/add-entries';
import { basmati, complet, galettes } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { searchLocalFoods } from './local-search';
import { defaultGrams, readFavoriteFoods, readLastGrams, readRecentFoods } from './recents';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';
const at = (day: number, hours: number) => new Date(2026, 10, day, hours);

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('addEntries', () => {
  it('copies the values of the quantity into the entries, and the global foods to the phone', () => {
    addEntries(db, alice, {
      mealType: 'dinner',
      items: [
        { food: basmati, grams: 250 },
        { food: { ...galettes, brand: 'Bjorg' }, grams: 20 },
      ],
      at: at(2, 19),
    });

    const entries = db.select().from(schema.logEntries).all();
    expect(entries).toEqual([
      expect.objectContaining({
        userId: alice,
        date: '2026-11-02',
        mealType: 'dinner',
        foodId: basmati.id,
        label: 'Riz basmati cuit',
        grams: 250,
        kcal: 325,
        proteinG: 6.75,
        carbsG: 70,
        fatG: 1,
        loggedAt: at(2, 19),
      }),
      expect.objectContaining({ label: 'Galettes de riz (Bjorg)', kcal: 77.4 }),
    ]);
    expect(
      db
        .select()
        .from(schema.foods)
        .all()
        .map(({ id, ownerId }) => ({ id, ownerId })),
    ).toEqual([
      { id: basmati.id, ownerId: null },
      { id: galettes.id, ownerId: null },
    ]);
  });

  it('updates the cached food when it is added again', () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 200 }],
      at: at(1, 12),
    });
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: { ...basmati, kcal100g: 131 }, grams: 200 }],
      at: at(2, 12),
    });

    expect(db.select().from(schema.foods).all()).toHaveLength(1);
    expect(db.select().from(schema.foods).get()?.kcal100g).toBe(131);
    // The first entry keeps the values it was logged with.
    expect(
      db
        .select()
        .from(schema.logEntries)
        .all()
        .map(({ kcal }) => kcal),
    ).toEqual([260, 262]);
  });
});

describe('readRecentFoods', () => {
  it('lists the foods of the latest entries once, with their last quantity', () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 200 }],
      at: at(1, 12),
    });
    addEntries(db, alice, {
      mealType: 'snack',
      items: [{ food: galettes, grams: 30 }],
      at: at(1, 16),
    });
    addEntries(db, alice, {
      mealType: 'dinner',
      items: [{ food: basmati, grams: 250 }],
      at: at(2, 19),
    });
    addEntries(db, bob, {
      mealType: 'dinner',
      items: [{ food: complet, grams: 100 }],
      at: at(2, 20),
    });

    expect(readRecentFoods(db, alice, 20)).toEqual([
      { food: basmati, lastGrams: 250 },
      { food: galettes, lastGrams: 30 },
    ]);
    expect(readRecentFoods(db, alice, 1)).toHaveLength(1);
    expect(readLastGrams(db, alice)).toEqual(
      new Map([
        [basmati.id, 250],
        [galettes.id, 30],
      ]),
    );
  });

  it('forgets the foods of deleted entries', () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 200 }],
      at: at(1, 12),
    });
    db.update(schema.logEntries).set({ deletedAt: new Date() }).run();

    expect(readRecentFoods(db, alice, 20)).toEqual([]);
  });
});

describe('readFavoriteFoods', () => {
  it('lists the starred foods once, newest first', () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [
        { food: basmati, grams: 200 },
        { food: galettes, grams: 30 },
      ],
      at: at(1, 12),
    });
    db.insert(schema.favorites)
      .values([
        { id: 'f1', userId: alice, foodId: basmati.id, createdAt: at(1, 13) },
        { id: 'f2', userId: alice, foodId: galettes.id, createdAt: at(1, 14) },
        { id: 'f3', userId: alice, foodId: basmati.id, createdAt: at(1, 10) },
        { id: 'f4', userId: bob, foodId: basmati.id, createdAt: at(1, 15) },
        { id: 'f5', userId: alice, foodId: galettes.id, deletedAt: new Date() },
      ])
      .run();

    expect(readFavoriteFoods(db, alice).map(({ food }) => food.name)).toEqual([
      'Galettes de riz',
      'Riz basmati cuit',
    ]);
  });
});

describe('searchLocalFoods', () => {
  it("finds the user's foods first, then the cached ones, without accents", () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 200 }],
      at: at(1, 12),
    });
    db.insert(schema.foods)
      .values([
        {
          id: 'mine',
          ownerId: alice,
          source: 'user',
          name: 'Riz au lait maison',
          brand: 'Mamie',
          kcal100g: 140,
          protein100g: 3,
          carbs100g: 25,
          fat100g: 3,
        },
        {
          id: 'bob',
          ownerId: bob,
          source: 'user',
          name: 'Riz de Bob',
          kcal100g: 1,
          protein100g: 0,
          carbs100g: 0,
          fat100g: 0,
        },
        {
          id: 'pates',
          ownerId: alice,
          source: 'user',
          name: 'Pâtes à la crème',
          kcal100g: 1,
          protein100g: 0,
          carbs100g: 0,
          fat100g: 0,
        },
      ])
      .run();

    expect(searchLocalFoods(db, alice, 'RIZ', 10).map(({ name }) => name)).toEqual([
      'Riz au lait maison',
      'Riz basmati cuit',
    ]);
    expect(searchLocalFoods(db, alice, 'pates creme', 10).map(({ name }) => name)).toEqual([
      'Pâtes à la crème',
    ]);
    expect(searchLocalFoods(db, alice, 'mamie', 10)).toHaveLength(1);
    expect(searchLocalFoods(db, alice, '  ', 10)).toEqual([]);
  });
});

describe('defaultGrams', () => {
  it('prefers the last quantity, then the usual portion, then 100 g', () => {
    expect(defaultGrams({ ...basmati, defaultPortionG: 125 }, 250)).toBe(250);
    expect(defaultGrams({ ...basmati, defaultPortionG: 125 }, null)).toBe(125);
    expect(defaultGrams(basmati, undefined)).toBe(100);
  });
});
