import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { addEntries } from './add-entries';
import { deleteEntry, readEntry, readMealEntries, scaleEntry, updateEntry } from './entries';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';
const evening = new Date(2026, 10, 2, 19, 0);

let db: LocalDatabase;
let entryId: string;

beforeEach(async () => {
  db = await createLocalDatabase();
  addEntries(db, alice, {
    mealType: 'dinner',
    items: [{ food: basmati, grams: 250 }],
    at: evening,
  });
  entryId = db.select().from(schema.logEntries).get()?.id ?? '';
});

describe('readMealEntries', () => {
  it("lists a meal's entries of the day", () => {
    addEntries(db, alice, {
      mealType: 'dinner',
      items: [{ food: basmati, grams: 100 }],
      at: new Date(2026, 10, 2, 20, 0),
    });
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 100 }],
      at: evening,
    });

    expect(readMealEntries(db, alice, '2026-11-02', 'dinner').map(({ grams }) => grams)).toEqual([
      250, 100,
    ]);
    expect(readMealEntries(db, bob, '2026-11-02', 'dinner')).toEqual([]);
  });
});

describe('updateEntry', () => {
  it('scales the copied values to the new quantity', () => {
    expect(updateEntry(db, alice, entryId, { grams: 100 })).toBe(true);

    expect(readEntry(db, alice, entryId)).toMatchObject({
      grams: 100,
      kcal: 130,
      proteinG: 2.7,
      carbsG: 28,
      fatG: 0.4,
      mealType: 'dinner',
    });
  });

  it('moves the entry to another meal and marks it changed for the sync', () => {
    const before = readEntry(db, alice, entryId)?.updatedAt.getTime() ?? 0;

    updateEntry(db, alice, entryId, { mealType: 'snack' });

    const entry = readEntry(db, alice, entryId);
    expect(entry).toMatchObject({ mealType: 'snack', grams: 250, kcal: 325 });
    expect(entry?.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("never changes another user's entry", () => {
    expect(updateEntry(db, bob, entryId, { grams: 1 })).toBe(false);
    expect(readEntry(db, alice, entryId)?.grams).toBe(250);
  });
});

describe('deleteEntry', () => {
  it('removes the entry from the journal, keeping a deleted row for the sync', () => {
    expect(deleteEntry(db, bob, entryId)).toBe(false);
    expect(deleteEntry(db, alice, entryId)).toBe(true);

    expect(readEntry(db, alice, entryId)).toBeNull();
    expect(readMealEntries(db, alice, '2026-11-02', 'dinner')).toEqual([]);
    expect(db.select().from(schema.logEntries).get()?.deletedAt).toBeInstanceOf(Date);
    expect(deleteEntry(db, alice, entryId)).toBe(false);
  });
});

describe('scaleEntry', () => {
  it('keeps the values of an entry without quantity (quick add)', () => {
    const quick = { grams: null, kcal: 300, proteinG: 0, carbsG: 0, fatG: 0 };
    expect(scaleEntry(quick, 50)).toEqual({ kcal: 300, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
