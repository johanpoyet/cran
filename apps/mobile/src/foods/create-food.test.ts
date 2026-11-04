import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { createLocalDatabase } from '../test/local-database';
import { createFood } from './create-food';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const userId = '0192f0c0-0000-7000-8000-00000000a11c';
const galette = {
  name: 'Galette de sarrasin',
  brand: null,
  kcal100g: 162,
  protein100g: 6,
  carbs100g: 30,
  fat100g: 2,
  portions: [
    { label: '1 galette', grams: 50 },
    { label: '1 grande galette', grams: 80 },
  ],
};

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('createFood', () => {
  it('saves a user food with a UUID v7, its portions, and no favourite unless asked', () => {
    const id = createFood(db, userId, galette, { favorite: false });

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(db.select().from(schema.foods).all()).toEqual([
      expect.objectContaining({
        id,
        ownerId: userId,
        source: 'user',
        sourceRef: null,
        name: 'Galette de sarrasin',
        brand: null,
        kcal100g: 162,
        qualityFlag: 'ok',
        deletedAt: null,
      }),
    ]);
    const portions = db.select().from(schema.foodPortions).all();
    expect(
      portions.map(({ label, grams, foodId, ownerId }) => ({ label, grams, foodId, ownerId })),
    ).toEqual([
      { label: '1 galette', grams: 50, foodId: id, ownerId: userId },
      { label: '1 grande galette', grams: 80, foodId: id, ownerId: userId },
    ]);
    expect(db.select().from(schema.favorites).all()).toEqual([]);
  });

  it('adds the food to the favourites', () => {
    const id = createFood(db, userId, galette, { favorite: true });

    expect(db.select().from(schema.favorites).all()).toEqual([
      expect.objectContaining({ userId, foodId: id, recipeId: null }),
    ]);
  });

  it('saves an incoherent food anyway, flagged', () => {
    createFood(db, userId, { ...galette, kcal100g: 300 }, { favorite: false });

    expect(db.select().from(schema.foods).get()?.qualityFlag).toBe('incoherent');
  });

  it('keeps the barcode it was created from, as an EAN-13', () => {
    const id = createFood(db, userId, galette, { favorite: false, barcode: '036000291452' });

    expect(db.select().from(schema.foods).all()).toEqual([
      expect.objectContaining({ id, sourceRef: '0036000291452' }),
    ]);
  });

  it('takes the barcode from a previous food of the user', () => {
    const first = createFood(db, userId, galette, { favorite: false, barcode: '3017620422003' });
    const second = createFood(
      db,
      userId,
      { ...galette, name: 'Galette corrigée' },
      {
        favorite: false,
        barcode: '3017620422003',
      },
    );

    const refs = new Map(
      db
        .select()
        .from(schema.foods)
        .all()
        .map((row) => [row.id, row.sourceRef]),
    );
    expect(refs.get(first)).toBeNull();
    expect(refs.get(second)).toBe('3017620422003');
  });
});
