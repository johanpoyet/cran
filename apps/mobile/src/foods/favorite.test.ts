import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { addEntries } from '../journal/add-entries';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { isFavorite, setFavorite } from './favorite';
import { readPortions } from './portions';
import { readFavoriteFoods } from './recents';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('setFavorite', () => {
  it('stars a global food, copied to the phone for the "Favoris" tab', () => {
    setFavorite(db, alice, basmati, true);

    expect(isFavorite(db, alice, basmati.id)).toBe(true);
    expect(isFavorite(db, bob, basmati.id)).toBe(false);
    expect(readFavoriteFoods(db, alice).map(({ food }) => food.id)).toEqual([basmati.id]);
    expect(db.select().from(schema.foods).get()).toMatchObject({ id: basmati.id, ownerId: null });
  });

  it('stars once, and unstars with a soft delete', () => {
    setFavorite(db, alice, basmati, true);
    setFavorite(db, alice, basmati, true);
    expect(db.select().from(schema.favorites).all()).toHaveLength(1);

    setFavorite(db, alice, basmati, false);

    expect(isFavorite(db, alice, basmati.id)).toBe(false);
    expect(db.select().from(schema.favorites).get()?.deletedAt).toBeInstanceOf(Date);
    expect(readFavoriteFoods(db, alice)).toEqual([]);
  });
});

describe('readPortions', () => {
  it("lists the food's portions of the catalogue and the user's, smallest first", () => {
    setFavorite(db, alice, basmati, true);
    db.insert(schema.foodPortions)
      .values([
        { id: 'p1', foodId: basmati.id, ownerId: alice, label: '1 bol', grams: 150 },
        { id: 'p2', foodId: basmati.id, ownerId: null, label: '1 cuillère', grams: 20 },
        { id: 'p3', foodId: basmati.id, ownerId: bob, label: '1 assiette', grams: 300 },
        {
          id: 'p4',
          foodId: basmati.id,
          ownerId: alice,
          label: 'supprimée',
          grams: 1,
          deletedAt: new Date(),
        },
      ])
      .run();

    expect(readPortions(db, alice, basmati.id)).toEqual([
      { label: '1 cuillère', grams: 20 },
      { label: '1 bol', grams: 150 },
    ]);
  });
});

describe('addEntries with a portion', () => {
  it('keeps the portion chosen with the entry', () => {
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 150, portionLabel: '1 bol' }],
      at: new Date(2026, 10, 3, 12),
    });

    expect(db.select().from(schema.logEntries).get()).toMatchObject({
      grams: 150,
      portionLabel: '1 bol',
      kcal: 195,
    });
  });
});
