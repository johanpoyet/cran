import { randomBytes } from 'node:crypto';

import { type SyncPullResult, type SyncPushResult, uuidV7 } from '@cran/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as schema from '../db/schema';
import { buildTestApp } from '../test/app';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { signUpUser } from '../test/session';

let database: TestDatabase;
let app: ReturnType<typeof buildTestApp>['app'];

beforeAll(async () => {
  database = await createTestDatabase();
  app = buildTestApp({ db: database.db }).app;
});

afterAll(async () => {
  await database.close();
});

const newId = () => uuidV7(Date.now(), randomBytes(10));
const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

function entry(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: newId(),
    userId,
    createdAt: iso(),
    updatedAt: iso(),
    deletedAt: null,
    date: '2026-11-03',
    mealType: 'lunch',
    foodId: null,
    recipeId: null,
    label: 'Riz basmati cuit',
    grams: 250,
    portionLabel: null,
    servings: null,
    kcal: 325,
    proteinG: 6.75,
    carbsG: 70,
    fatG: 1,
    loggedAt: iso(),
    ...overrides,
  };
}

function userFood(ownerId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: newId(),
    ownerId,
    createdAt: iso(),
    updatedAt: iso(),
    deletedAt: null,
    source: 'user',
    sourceRef: null,
    name: 'Galette de sarrasin',
    brand: null,
    kcal100g: 162,
    protein100g: 6,
    carbs100g: 30,
    fat100g: 2,
    fiber100g: null,
    salt100g: null,
    defaultPortionG: null,
    offSyncedAt: null,
    qualityFlag: 'ok',
    ...overrides,
  };
}

async function push(cookie: string | null, body: unknown) {
  return app.request('/v1/sync/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function pushed(cookie: string, changes: { table: string; row: unknown }[]) {
  const res = await push(cookie, { changes });
  expect(res.status).toBe(200);
  return (await res.json()) as SyncPushResult;
}

async function pull(cookie: string | null, query = '') {
  return app.request(`/v1/sync/pull${query}`, cookie ? { headers: { cookie } } : {});
}

async function pulled(cookie: string, query = '') {
  const res = await pull(cookie, query);
  expect(res.status).toBe(200);
  return (await res.json()) as SyncPullResult;
}

async function entryRow(id: string) {
  const [row] = await database.db
    .select()
    .from(schema.logEntries)
    .where(eq(schema.logEntries.id, id));
  return row;
}

describe('POST /v1/sync/push', () => {
  it('applies new rows and gives them back by pull', async () => {
    const alice = await signUpUser(app);
    const food = userFood(alice.id);
    const lunch = entry(alice.id, { foodId: food.id });
    const water = {
      id: newId(),
      userId: alice.id,
      createdAt: iso(),
      updatedAt: iso(),
      deletedAt: null,
      date: '2026-11-03',
      ml: 250,
    };

    const result = await pushed(alice.cookie, [
      { table: 'log_entries', row: lunch },
      { table: 'foods', row: food },
      { table: 'water_logs', row: water },
    ]);

    // The food is applied before the entry that references it.
    expect(result).toEqual({ accepted: [food.id, lunch.id, water.id], rejected: [] });
    const { changes } = await pulled(alice.cookie);
    expect(changes.map(({ table }) => table)).toEqual(['foods', 'log_entries', 'water_logs']);
    expect(changes.find(({ table }) => table === 'log_entries')?.row).toEqual(lunch);
  });

  it('keeps the servings of a recipe entry, and accepts a row from an app without them', async () => {
    const alice = await signUpUser(app);
    const parts = entry(alice.id, { label: 'Poulet riz curry', grams: 1050, servings: 2 });
    const older = entry(alice.id);
    // A row pushed by an app released before S6-2 has no servings.
    const withoutServings = Object.fromEntries(
      Object.entries(older).filter(([key]) => key !== 'servings'),
    );

    expect(
      await pushed(alice.cookie, [
        { table: 'log_entries', row: parts },
        { table: 'log_entries', row: withoutServings },
      ]),
    ).toEqual({ accepted: [parts.id, older.id], rejected: [] });
    expect((await entryRow(parts.id))?.servings).toBe(2);
    expect((await entryRow(older.id))?.servings).toBeNull();
  });

  it('keeps a template item in grams or in servings, never without a quantity', async () => {
    const alice = await signUpUser(app);
    const food = userFood(alice.id);
    const owned = { userId: alice.id, createdAt: iso(), updatedAt: iso(), deletedAt: null };
    const template = { ...owned, id: newId(), name: 'Dîner prise de masse', mealType: 'dinner' };
    const item = (overrides: Record<string, unknown>) => ({
      ...owned,
      id: newId(),
      templateId: template.id,
      foodId: food.id,
      recipeId: null,
      grams: null,
      servings: null,
      position: 0,
      ...overrides,
    });
    const inGrams = item({ grams: 250 });
    const inServings = item({ servings: 2, position: 1 });
    const empty = item({ position: 2 });

    const result = await pushed(alice.cookie, [
      { table: 'foods', row: food },
      { table: 'meal_templates', row: template },
      { table: 'meal_template_items', row: inGrams },
      { table: 'meal_template_items', row: inServings },
      { table: 'meal_template_items', row: empty },
    ]);

    expect(result.accepted).toEqual([food.id, template.id, inGrams.id, inServings.id]);
    expect(result.rejected).toEqual([{ id: empty.id, reason: 'invalid' }]);
  });

  it('is idempotent: the same batch again creates and changes nothing', async () => {
    const alice = await signUpUser(app);
    const lunch = entry(alice.id);
    await pushed(alice.cookie, [{ table: 'log_entries', row: lunch }]);
    const before = await entryRow(lunch.id);

    const again = await pushed(alice.cookie, [{ table: 'log_entries', row: lunch }]);

    expect(again).toEqual({ accepted: [lunch.id], rejected: [] });
    expect(await entryRow(lunch.id)).toEqual(before);
    const rows = await database.db
      .select()
      .from(schema.logEntries)
      .where(eq(schema.logEntries.userId, alice.id));
    expect(rows).toHaveLength(1);
  });

  it('keeps the latest write (last write wins on updatedAt)', async () => {
    const alice = await signUpUser(app);
    const lunch = entry(alice.id, { updatedAt: iso(-60_000) });
    await pushed(alice.cookie, [{ table: 'log_entries', row: lunch }]);

    const newer = { ...lunch, grams: 100, kcal: 130, updatedAt: iso() };
    expect(await pushed(alice.cookie, [{ table: 'log_entries', row: newer }])).toEqual({
      accepted: [lunch.id],
      rejected: [],
    });
    expect(await entryRow(lunch.id)).toMatchObject({ grams: 100, kcal: 130 });

    const older = { ...lunch, grams: 400, updatedAt: iso(-30_000) };
    expect(await pushed(alice.cookie, [{ table: 'log_entries', row: older }])).toEqual({
      accepted: [],
      rejected: [{ id: lunch.id, reason: 'stale' }],
    });
    expect(await entryRow(lunch.id)).toMatchObject({ grams: 100 });
  });

  it('propagates a deletion as a row with deletedAt', async () => {
    const alice = await signUpUser(app);
    const lunch = entry(alice.id, { updatedAt: iso(-1000) });
    await pushed(alice.cookie, [{ table: 'log_entries', row: lunch }]);
    const { cursor } = await pulled(alice.cookie);

    const deleted = { ...lunch, deletedAt: iso(), updatedAt: iso() };
    await pushed(alice.cookie, [{ table: 'log_entries', row: deleted }]);

    const { changes } = await pulled(alice.cookie, `?cursor=${String(cursor)}`);
    expect(changes).toEqual([{ table: 'log_entries', row: deleted }]);
  });

  it("refuses another user's row, and never changes it", async () => {
    const alice = await signUpUser(app);
    const bob = await signUpUser(app);
    const lunch = entry(alice.id, { updatedAt: iso(-1000) });
    await pushed(alice.cookie, [{ table: 'log_entries', row: lunch }]);

    const takeover = await pushed(bob.cookie, [
      { table: 'log_entries', row: { ...lunch, userId: bob.id, kcal: 1, updatedAt: iso() } },
      { table: 'log_entries', row: entry(alice.id) },
    ]);

    expect(takeover.accepted).toEqual([]);
    expect(takeover.rejected.map(({ reason }) => reason)).toEqual(['forbidden', 'forbidden']);
    expect(await entryRow(lunch.id)).toMatchObject({ userId: alice.id, kcal: 325 });
  });

  it.each([
    [
      'a date in the future beyond 5 minutes',
      'log_entries',
      { updatedAt: iso(6 * 60_000) },
      'future_timestamp',
    ],
    ['an invalid row', 'log_entries', { kcal: -5 }, 'invalid'],
    ['an unknown field', 'log_entries', { extra: true }, 'invalid'],
    [
      'an unknown food',
      'log_entries',
      { foodId: '019a4b2c-1d2e-7f30-8a41-000000000000' },
      'unknown_reference',
    ],
  ])('rejects %s', async (_, table, overrides, reason) => {
    const alice = await signUpUser(app);
    const row = entry(alice.id, overrides);

    expect(await pushed(alice.cookie, [{ table, row }])).toEqual({
      accepted: [],
      rejected: [{ id: row.id, reason }],
    });
  });

  it('accepts a clock up to 5 minutes ahead', async () => {
    const alice = await signUpUser(app);
    const row = entry(alice.id, { updatedAt: iso(4 * 60_000) });

    expect((await pushed(alice.cookie, [{ table: 'log_entries', row }])).accepted).toEqual([
      row.id,
    ]);
  });

  it('refuses the tables written by the server, global foods and unknown tables', async () => {
    const alice = await signUpUser(app);
    const target = {
      id: newId(),
      userId: alice.id,
      createdAt: iso(),
      updatedAt: iso(),
      deletedAt: null,
      weekStart: '2026-11-02',
      maintenanceKcal: 2650,
      targetKcal: 9999,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      method: 'formula',
      status: 'on_track',
    };
    const ciqual = userFood(alice.id, { source: 'ciqual', sourceRef: '9104' });

    const result = await pushed(alice.cookie, [
      { table: 'weekly_targets', row: target },
      { table: 'foods', row: ciqual },
      { table: 'progress_photos', row: { id: 'photo' } },
    ]);

    expect(result.rejected).toEqual([
      { id: target.id, reason: 'read_only' },
      { id: ciqual.id, reason: 'forbidden' },
      { id: 'photo', reason: 'unknown_table' },
    ]);
  });

  it('refuses a second profile for the same user', async () => {
    const alice = await signUpUser(app);
    const profile = {
      id: newId(),
      userId: alice.id,
      createdAt: iso(),
      updatedAt: iso(),
      deletedAt: null,
      sex: 'male',
      birthYear: 2005,
      heightCm: 180,
      activityLevel: 3,
      goalRateKgMonth: 1,
      proteinGPerKg: 2.2,
      fatGPerKg: 1.25,
      trainingBonusKcal: 150,
      trainingDays: 0,
      waterGoalMl: 3000,
      reminders: {
        meal: { enabled: true, time: '14:00' },
        weighIn: { enabled: true, time: '08:00' },
        weeklyReview: { enabled: false, time: '19:00' },
      },
      healthDataConsentAt: null,
    };
    expect((await pushed(alice.cookie, [{ table: 'profiles', row: profile }])).accepted).toEqual([
      profile.id,
    ]);

    const second = { ...profile, id: newId() };
    expect((await pushed(alice.cookie, [{ table: 'profiles', row: second }])).rejected).toEqual([
      { id: second.id, reason: 'conflict' },
    ]);
  });

  it.each([
    ['no changes array', {}],
    [
      'more than 500 changes',
      { changes: Array.from({ length: 501 }, () => ({ table: 'x', row: {} })) },
    ],
  ])('answers 400 for %s', async (_, body) => {
    const alice = await signUpUser(app);
    const res = await push(alice.cookie, body);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'validation_error' } });
  });

  it('requires a session', async () => {
    expect((await push(null, { changes: [] })).status).toBe(401);
  });
});

describe('GET /v1/sync/pull', () => {
  it('pages through the changes in write order with the cursor', async () => {
    const alice = await signUpUser(app);
    const rows = [entry(alice.id), entry(alice.id), entry(alice.id)];
    for (const row of rows) await pushed(alice.cookie, [{ table: 'log_entries', row }]);

    const first = await pulled(alice.cookie, '?limit=2');
    expect(first.changes.map(({ row }) => row.id)).toEqual([rows[0]?.id, rows[1]?.id]);
    expect(first.hasMore).toBe(true);

    const second = await pulled(alice.cookie, `?cursor=${String(first.cursor)}&limit=2`);
    expect(second.changes.map(({ row }) => row.id)).toEqual([rows[2]?.id]);
    expect(second.hasMore).toBe(false);

    const empty = await pulled(alice.cookie, `?cursor=${String(second.cursor)}`);
    expect(empty).toEqual({ changes: [], cursor: second.cursor, hasMore: false });
  });

  it("never returns another user's rows, nor the global catalogue", async () => {
    const alice = await signUpUser(app);
    const bob = await signUpUser(app);
    await pushed(alice.cookie, [{ table: 'log_entries', row: entry(alice.id) }]);
    await database.db.insert(schema.foods).values({
      source: 'ciqual',
      sourceRef: `pull-${newId()}`,
      name: 'Riz',
      kcal100g: 130,
      protein100g: 2.7,
      carbs100g: 28,
      fat100g: 0.4,
    });

    expect((await pulled(bob.cookie)).changes).toEqual([]);
  });

  it('includes the rows written by the server (profile and weekly target of the onboarding)', async () => {
    const alice = await signUpUser(app);
    await app.request('/v1/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: alice.cookie },
      body: JSON.stringify({
        sex: 'male',
        birthYear: 2005,
        heightCm: 180,
        activityLevel: 3,
        goalRateKgMonth: 1,
        trainingDays: 0,
        trainingBonusKcal: 150,
        weightKg: 68.4,
        date: '2026-11-03',
        healthDataConsent: true,
      }),
    });

    const { changes } = await pulled(alice.cookie);

    expect(changes.map(({ table }) => table).sort()).toEqual([
      'profiles',
      'weekly_targets',
      'weigh_ins',
    ]);
    expect(changes.find(({ table }) => table === 'weekly_targets')?.row).toMatchObject({
      targetKcal: 2900,
      weekStart: '2026-11-02',
    });
  });

  it.each([['?cursor=-1'], ['?limit=0'], ['?limit=501'], ['?cursor=abc']])(
    'answers 400 for %s',
    async (query) => {
      const alice = await signUpUser(app);
      expect((await pull(alice.cookie, query)).status).toBe(400);
    },
  );

  it('requires a session', async () => {
    expect((await pull(null)).status).toBe(401);
  });
});
