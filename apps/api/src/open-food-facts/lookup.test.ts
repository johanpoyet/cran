import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { foods } from '../db/schema';
import { createFoodRepository } from '../repositories/foods';
import { buildTestApp } from '../test/app';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { signUpUser } from '../test/session';
import { fakeOpenFoodFacts, nutella, uniqueEan } from './fixtures';
import { createBarcodeLookup, OFF_CACHE_DAYS } from './lookup';

const DAY_MS = 24 * 60 * 60 * 1000;

let database: TestDatabase;
let userId: string;

beforeAll(async () => {
  database = await createTestDatabase();
  userId = (await signUpUser(buildTestApp({ db: database.db }).app)).id;
});

afterAll(async () => {
  await database.close();
});

/** A lookup whose clock the test moves. */
function setup() {
  const off = fakeOpenFoodFacts();
  let now = new Date('2026-11-04T10:00:00Z');
  const lookup = createBarcodeLookup(createFoodRepository(database.db), off.client, () => now);
  return {
    off,
    lookup,
    later: (days: number) => {
      now = new Date(now.getTime() + days * DAY_MS);
    },
  };
}

async function kcalOf(ean: string) {
  const [row] = await database.db.select().from(foods).where(eq(foods.sourceRef, ean));
  return row?.kcal100g;
}

describe('createBarcodeLookup', () => {
  it(`keeps a product ${String(OFF_CACHE_DAYS)} days, then refreshes it`, async () => {
    const { off, lookup, later } = setup();
    const ean = uniqueEan();
    off.set(ean, nutella);
    await lookup(userId, ean);

    // New recipe on Open Food Facts: not seen while the cache is fresh.
    off.set(ean, {
      ...nutella,
      nutriments: { ...nutella.nutriments, 'energy-kcal_100g': 530 },
    });
    later(OFF_CACHE_DAYS - 1);
    await lookup(userId, ean);
    expect(off.calls).toEqual([ean]);
    expect(await kcalOf(ean)).toBe(539);

    later(2);
    const result = await lookup(userId, ean);
    expect(off.calls).toEqual([ean, ean]);
    expect(result.status === 'found' && result.detail.food.kcal100g).toBe(530);
    expect(await kcalOf(ean)).toBe(530);
  });

  it('serves an outdated product when Open Food Facts is unavailable', async () => {
    const { off, lookup, later } = setup();
    const ean = uniqueEan();
    off.set(ean, nutella);
    await lookup(userId, ean);

    later(OFF_CACHE_DAYS + 1);
    off.setAvailable(false);
    const result = await lookup(userId, ean);

    expect(result.status).toBe('found');
    expect(off.calls).toEqual([ean, ean]);
  });

  it('keeps serving a cached product that Open Food Facts no longer knows', async () => {
    const { off, lookup, later } = setup();
    const ean = uniqueEan();
    off.set(ean, nutella);
    await lookup(userId, ean);

    later(OFF_CACHE_DAYS + 1);
    off.set(ean, null);

    expect((await lookup(userId, ean)).status).toBe('found');
  });
});
