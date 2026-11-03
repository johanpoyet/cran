import { syncRowSchemas } from '@cran/shared';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { createFood } from '../foods/create-food';
import { readRecentFoods } from '../foods/recents';
import { addEntries } from '../journal/add-entries';
import { deleteEntry, readMealEntries, updateEntry } from '../journal/entries';
import { addWater } from '../journal/water';
import { setWaterGoal } from '../profile/settings';
import { createFakeSyncServer } from '../test/fake-sync-server';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { insertProfile, me } from '../test/me';
import { applyPull, readCursor } from './apply-pull';
import { syncNow } from './engine';
import { cacheMissingFoods, missingFoodIds } from './food-cache';
import { MAX_ATTEMPTS, pendingCount, readBatch, settle } from './queue';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = me.user.id;
const lunch = new Date(2026, 10, 3, 12, 30);

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
  jest.restoreAllMocks();
});

function queue(database: LocalDatabase = db) {
  return database
    .select({ table: schema.pendingChanges.tableName, version: schema.pendingChanges.version })
    .from(schema.pendingChanges)
    .all();
}

describe('queue', () => {
  it("queues every change of the user's rows, once per row", () => {
    addEntries(db, alice, { mealType: 'lunch', items: [{ food: basmati, grams: 250 }], at: lunch });
    const [entry] = readMealEntries(db, alice, '2026-11-03', 'lunch');
    updateEntry(db, alice, entry?.id ?? '', { grams: 100 });
    addWater(db, alice, 250, lunch);

    // The cached CIQUAL food is not queued: it is not the user's.
    expect(queue()).toEqual([
      { table: 'log_entries', version: 2 },
      { table: 'water_logs', version: 1 },
    ]);
  });

  it('builds rows valid for the server, for every kind of change', () => {
    insertProfile(db);
    setWaterGoal(db, alice, 3500);
    createFood(
      db,
      alice,
      {
        name: 'Galette',
        brand: null,
        kcal100g: 162,
        protein100g: 6,
        carbs100g: 30,
        fat100g: 2,
        portions: [{ label: '1 galette', grams: 50 }],
      },
      { favorite: true },
    );
    addEntries(db, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 250, portionLabel: null }],
      at: lunch,
    });

    const batch = readBatch(db);

    expect(batch.map(({ table }) => table).sort()).toEqual([
      'favorites',
      'food_portions',
      'foods',
      'log_entries',
      'profiles',
    ]);
    for (const { table, row } of batch) {
      expect(syncRowSchemas[table].safeParse(row).error).toBeUndefined();
    }
  });

  it('keeps a row changed again during the push, and drops the accepted ones', () => {
    addWater(db, alice, 250, lunch);
    const batch = readBatch(db);
    db.update(schema.waterLogs).set({ ml: 500 }).run();

    settle(db, batch, { accepted: batch.map(({ id }) => id), rejected: [] });

    expect(queue()).toEqual([{ table: 'water_logs', version: 2 }]);
  });

  it('drops a stale or invalid row, retries an unknown reference a few times', () => {
    addWater(db, alice, 250, lunch);
    addWater(db, alice, 500, lunch);
    addWater(db, alice, 750, lunch);
    const batch = readBatch(db);
    const [stale, invalid, retried] = batch.map(({ id }) => id);
    const refuse = () =>
      settle(db, readBatch(db), {
        accepted: [],
        rejected: [
          { id: stale ?? '', reason: 'stale' },
          { id: invalid ?? '', reason: 'invalid' },
          { id: retried ?? '', reason: 'unknown_reference' },
        ],
      });

    refuse();
    expect(pendingCount(db)).toBe(1);
    for (let attempt = 2; attempt < MAX_ATTEMPTS; attempt += 1) refuse();
    expect(pendingCount(db)).toBe(1);
    refuse();
    expect(pendingCount(db)).toBe(0);
  });

  it('forgets a queued row that no longer exists', () => {
    addWater(db, alice, 250, lunch);
    db.delete(schema.waterLogs).run();

    expect(readBatch(db)).toEqual([]);
    expect(pendingCount(db)).toBe(0);
  });
});

describe('applyPull', () => {
  const pulledEntry = (overrides: Record<string, unknown> = {}) => ({
    id: '019a4b2c-1d2e-7f30-8a41-b5c6d7e8f901',
    userId: alice,
    createdAt: '2026-11-03T11:30:00.000Z',
    updatedAt: '2026-11-03T11:30:00.000Z',
    deletedAt: null,
    date: '2026-11-03',
    mealType: 'lunch',
    foodId: null,
    recipeId: null,
    label: 'Riz basmati cuit',
    grams: 250,
    portionLabel: null,
    kcal: 325,
    proteinG: 6.75,
    carbsG: 70,
    fatG: 1,
    loggedAt: '2026-11-03T11:30:00.000Z',
    ...overrides,
  });

  it('writes the pulled rows without queueing them, and keeps the cursor', () => {
    applyPull(db, {
      changes: [{ table: 'log_entries', row: pulledEntry() }],
      cursor: 42,
      hasMore: false,
    });

    expect(readMealEntries(db, alice, '2026-11-03', 'lunch')).toEqual([
      expect.objectContaining({ kcal: 325, loggedAt: new Date('2026-11-03T11:30:00.000Z') }),
    ]);
    expect(pendingCount(db)).toBe(0);
    expect(readCursor(db)).toBe(42);
  });

  it('keeps a newer local change not pushed yet', () => {
    applyPull(db, {
      changes: [{ table: 'log_entries', row: pulledEntry() }],
      cursor: 1,
      hasMore: false,
    });
    updateEntry(db, alice, pulledEntry().id, { grams: 100 });

    applyPull(db, {
      changes: [{ table: 'log_entries', row: pulledEntry({ grams: 400, kcal: 520 }) }],
      cursor: 2,
      hasMore: false,
    });

    expect(readMealEntries(db, alice, '2026-11-03', 'lunch')[0]?.grams).toBe(100);
    expect(pendingCount(db)).toBe(1);
  });

  it('takes a newer server row over an older local change, and applies deletions', () => {
    applyPull(db, {
      changes: [{ table: 'log_entries', row: pulledEntry() }],
      cursor: 1,
      hasMore: false,
    });
    db.update(schema.logEntries)
      .set({ grams: 100, updatedAt: new Date('2026-11-03T11:31:00.000Z') })
      .run();

    applyPull(db, {
      changes: [
        {
          table: 'log_entries',
          row: pulledEntry({
            updatedAt: '2026-11-03T11:40:00.000Z',
            deletedAt: '2026-11-03T11:40:00.000Z',
          }),
        },
      ],
      cursor: 2,
      hasMore: false,
    });

    expect(readMealEntries(db, alice, '2026-11-03', 'lunch')).toEqual([]);
    expect(pendingCount(db)).toBe(0);
  });

  it('skips an invalid row', () => {
    applyPull(db, {
      changes: [{ table: 'log_entries', row: pulledEntry({ kcal: -1 }) }],
      cursor: 3,
      hasMore: false,
    });

    expect(readMealEntries(db, alice, '2026-11-03', 'lunch')).toEqual([]);
    expect(readCursor(db)).toBe(3);
  });
});

describe('syncNow between two phones', () => {
  it('brings a day typed offline on one phone to the other (criterion of S4-3)', async () => {
    const server = createFakeSyncServer([basmati]);
    jest.spyOn(globalThis, 'fetch').mockImplementation(server.fetch);
    const phone = db;
    const other = await createLocalDatabase();

    // Offline on the first phone: entries and water, then a correction and a deletion.
    addEntries(phone, alice, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 250 }],
      at: lunch,
    });
    addEntries(phone, alice, {
      mealType: 'dinner',
      items: [{ food: basmati, grams: 300 }],
      at: new Date(2026, 10, 3, 20),
    });
    addWater(phone, alice, 250, lunch);
    const [dinner] = readMealEntries(phone, alice, '2026-11-03', 'dinner');
    deleteEntry(phone, alice, dinner?.id ?? '');

    // Back online.
    expect(await syncNow(phone)).toEqual({ pushed: 3, pulled: 3, cached: 0 });
    expect(pendingCount(phone)).toBe(0);

    const report = await syncNow(other);
    expect(report).toEqual({ pushed: 0, pulled: 3, cached: 1 });
    expect(readMealEntries(other, alice, '2026-11-03', 'lunch').map(({ kcal }) => kcal)).toEqual([
      325,
    ]);
    expect(readMealEntries(other, alice, '2026-11-03', 'dinner')).toEqual([]);
    expect(pendingCount(other)).toBe(0);

    // The CIQUAL rice of the entries was copied: the recents show it on the other phone too.
    expect(readRecentFoods(other, alice, 20).map(({ food }) => food.name)).toEqual([
      'Riz basmati cuit',
    ]);

    // Nothing new: nothing exchanged.
    expect(await syncNow(other)).toEqual({ pushed: 0, pulled: 0, cached: 0 });
  });

  it('keeps the latest change made on two phones', async () => {
    const server = createFakeSyncServer([basmati]);
    jest.spyOn(globalThis, 'fetch').mockImplementation(server.fetch);
    const other = await createLocalDatabase();
    addEntries(db, alice, { mealType: 'lunch', items: [{ food: basmati, grams: 250 }], at: lunch });
    await syncNow(db);
    await syncNow(other);
    const id = readMealEntries(db, alice, '2026-11-03', 'lunch')[0]?.id ?? '';

    updateEntry(other, alice, id, { grams: 150 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    updateEntry(db, alice, id, { grams: 200 });
    await syncNow(db);
    await syncNow(other);
    await syncNow(db);

    expect(readMealEntries(db, alice, '2026-11-03', 'lunch')[0]?.grams).toBe(200);
    expect(readMealEntries(other, alice, '2026-11-03', 'lunch')[0]?.grams).toBe(200);
  });

  it('fails when the server cannot be reached, keeping the queue', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    addWater(db, alice, 250, lunch);

    await expect(syncNow(db)).rejects.toThrow(TypeError);
    expect(pendingCount(db)).toBe(1);
  });
});

describe('global food cache', () => {
  it('copies the foods used on the phone but missing from it, once', async () => {
    const server = createFakeSyncServer([basmati]);
    jest.spyOn(globalThis, 'fetch').mockImplementation(server.fetch);
    db.insert(schema.logEntries)
      .values({
        id: 'e1',
        userId: alice,
        date: '2026-11-03',
        mealType: 'lunch',
        foodId: basmati.id,
        label: 'Riz basmati cuit',
        grams: 250,
        kcal: 325,
        proteinG: 6.75,
        carbsG: 70,
        fatG: 1,
        loggedAt: lunch,
      })
      .run();
    db.insert(schema.favorites).values({ id: 'f1', userId: alice, foodId: basmati.id }).run();
    expect(missingFoodIds(db)).toEqual([basmati.id]);

    expect(await cacheMissingFoods(db)).toBe(1);

    expect(db.select().from(schema.foods).all()).toEqual([
      expect.objectContaining({ id: basmati.id, ownerId: null, name: 'Riz basmati cuit' }),
    ]);
    // Copied, not queued: the server already has it.
    expect(pendingCount(db)).toBe(2);
    expect(missingFoodIds(db)).toEqual([]);
    expect(await cacheMissingFoods(db)).toBe(0);
    expect(server.foodRequests).toEqual([basmati.id]);
  });

  it('skips a food the server no longer has', async () => {
    const server = createFakeSyncServer();
    jest.spyOn(globalThis, 'fetch').mockImplementation(server.fetch);
    db.insert(schema.favorites).values({ id: 'f1', userId: alice, foodId: basmati.id }).run();

    expect(await cacheMissingFoods(db)).toBe(0);
  });

  it('ignores the foods of deleted entries', () => {
    db.insert(schema.favorites)
      .values({ id: 'f1', userId: alice, foodId: basmati.id, deletedAt: new Date() })
      .run();

    expect(missingFoodIds(db)).toEqual([]);
  });
});
