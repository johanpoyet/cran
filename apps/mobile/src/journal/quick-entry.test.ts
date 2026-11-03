import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { addEntries } from './add-entries';
import { readMealEntries } from './entries';
import { addQuickEntry, copyEntries, yesterdayKey } from './quick-entry';
import { readToday } from './today';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const today = new Date(2026, 10, 3, 20, 0);

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('addQuickEntry', () => {
  it('adds calories without a food or quantity, with the default label', () => {
    addQuickEntry(db, alice, {
      mealType: 'dinner',
      entry: { label: '', kcal: 850, proteinG: 0, carbsG: 0, fatG: 0 },
      label: 'Ajout rapide',
      at: today,
    });

    expect(db.select().from(schema.logEntries).get()).toMatchObject({
      userId: alice,
      date: '2026-11-03',
      mealType: 'dinner',
      foodId: null,
      grams: null,
      label: 'Ajout rapide',
      kcal: 850,
      proteinG: 0,
    });
    expect(readToday(db, alice, today).meals[3]).toMatchObject({ count: 1, kcal: 850 });
  });

  it('keeps the name and macros typed', () => {
    addQuickEntry(db, alice, {
      mealType: 'lunch',
      entry: { label: 'Resto', kcal: 900, proteinG: 40, carbsG: 80, fatG: 35 },
      label: 'Ajout rapide',
      at: today,
    });

    expect(db.select().from(schema.logEntries).get()).toMatchObject({
      label: 'Resto',
      proteinG: 40,
      fatG: 35,
    });
  });
});

describe('yesterdayKey', () => {
  it('is the local day before, across months and years', () => {
    expect(yesterdayKey(today)).toBe('2026-11-02');
    expect(yesterdayKey(new Date(2026, 10, 1, 8))).toBe('2026-10-31');
    expect(yesterdayKey(new Date(2027, 0, 1, 0, 30))).toBe('2026-12-31');
  });
});

describe('copyEntries', () => {
  it("copies yesterday's meal into today's, with new entries", () => {
    const yesterday = new Date(2026, 10, 2, 19, 30);
    addEntries(db, alice, {
      mealType: 'dinner',
      items: [{ food: basmati, grams: 150, portionLabel: '1 bol' }],
      at: yesterday,
    });
    addQuickEntry(db, alice, {
      mealType: 'dinner',
      entry: { label: 'Dessert', kcal: 200, proteinG: 2, carbsG: 30, fatG: 8 },
      label: 'Ajout rapide',
      at: yesterday,
    });
    const source = readMealEntries(db, alice, '2026-11-02', 'dinner');

    copyEntries(db, alice, source, { mealType: 'dinner', at: today });

    const copied = readMealEntries(db, alice, '2026-11-03', 'dinner');
    expect(
      copied.map(({ label, grams, portionLabel, kcal, foodId }) => ({
        label,
        grams,
        portionLabel,
        kcal,
        foodId,
      })),
    ).toEqual([
      {
        label: 'Riz basmati cuit',
        grams: 150,
        portionLabel: '1 bol',
        kcal: 195,
        foodId: basmati.id,
      },
      { label: 'Dessert', grams: null, portionLabel: null, kcal: 200, foodId: null },
    ]);
    expect(copied.map(({ id }) => id)).not.toContain(source[0]?.id);
    expect(copied[0]?.loggedAt).toEqual(today);
    // Yesterday is unchanged.
    expect(readMealEntries(db, alice, '2026-11-02', 'dinner')).toHaveLength(2);
  });
});
