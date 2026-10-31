import { DEFAULT_REMINDERS, type Me } from '@cran/shared';
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

// Answers of the onboarding mockups.
const onboarding = {
  sex: 'male',
  birthYear: 2005,
  heightCm: 180,
  activityLevel: 3,
  goalRateKgMonth: 1,
  trainingDays: 0b0110101,
};

function getMe(cookie?: string) {
  return app.request('/v1/me', { headers: cookie ? { cookie } : {} });
}

function patchMe(body: unknown, cookie?: string) {
  return app.request('/v1/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function profileRow(userId: string) {
  const [row] = await database.db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId));
  return row;
}

describe('GET /v1/me', () => {
  it('returns the account without a profile before the onboarding', async () => {
    const user = await signUpUser(app);
    const res = await getMe(user.cookie);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: user.id, email: user.email }, profile: null });
  });

  it('requires a session', async () => {
    const res = await getMe();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'unauthorized' } });
  });
});

describe('PATCH /v1/me', () => {
  it('creates the profile from the onboarding answers, with defaults for the rest', async () => {
    const user = await signUpUser(app);
    const res = await patchMe(onboarding, user.cookie);

    expect(res.status).toBe(200);
    const me = (await res.json()) as Me;
    expect(me.profile).toEqual({
      ...onboarding,
      proteinGPerKg: 2.2,
      fatGPerKg: 1.25,
      trainingBonusKcal: 150,
      waterGoalMl: 3000,
      reminders: DEFAULT_REMINDERS,
      healthDataConsentAt: null,
      updatedAt: expect.any(String) as string,
    });
    expect((await (await getMe(user.cookie)).json()) as Me).toEqual(me);
  });

  it('updates only the given fields and moves the sync cursor', async () => {
    const user = await signUpUser(app);
    await patchMe(onboarding, user.cookie);
    const before = await profileRow(user.id);

    const reminders = { ...DEFAULT_REMINDERS, weeklyReview: { enabled: true, time: '19:00' } };
    const res = await patchMe({ goalRateKgMonth: 1.5, proteinGPerKg: 2, reminders }, user.cookie);

    expect(res.status).toBe(200);
    const { profile } = (await res.json()) as Me;
    expect(profile).toMatchObject({
      ...onboarding,
      goalRateKgMonth: 1.5,
      proteinGPerKg: 2,
      reminders,
    });
    const after = await profileRow(user.id);
    expect(after?.serverSeq).toBeGreaterThan(before?.serverSeq ?? Infinity);
    expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before?.updatedAt.getTime() ?? Infinity,
    );
  });

  it('refuses to create a profile without every onboarding answer', async () => {
    const user = await signUpUser(app);
    const res = await patchMe({ sex: 'male', heightCm: 180 }, user.cookie);

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: {
        code: 'profile_incomplete',
        message: 'Missing fields to create the profile',
        details: { missing: ['birthYear', 'activityLevel', 'goalRateKgMonth'] },
      },
    });
    expect(await profileRow(user.id)).toBeUndefined();
  });

  it.each([
    ['an empty update', {}],
    ['an out-of-range value', { heightCm: 300 }],
    ['an unknown rate', { goalRateKgMonth: 2 }],
    ['an unknown field', { heightCm: 180, userId: '00000000-0000-0000-0000-000000000000' }],
    ['a server field', { updatedAt: '2030-01-01T00:00:00.000Z' }],
  ])('rejects %s', async (_, body) => {
    const user = await signUpUser(app);
    await patchMe(onboarding, user.cookie);
    const res = await patchMe(body, user.cookie);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'validation_error' } });
  });

  it('rejects a body that is not JSON', async () => {
    const user = await signUpUser(app);
    const res = await app.request('/v1/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: user.cookie },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('requires a session', async () => {
    const res = await patchMe(onboarding);
    expect(res.status).toBe(401);
  });
});

describe('isolation between users', () => {
  it('never lets a user read or change the profile of another', async () => {
    const alice = await signUpUser(app);
    const bob = await signUpUser(app);
    await patchMe(onboarding, alice.cookie);
    const aliceBefore = await profileRow(alice.id);

    // Bob sees only his own (missing) profile.
    expect(((await (await getMe(bob.cookie)).json()) as Me).profile).toBeNull();

    // Bob's update cannot target Alice: it only creates or changes Bob's own row.
    const res = await patchMe({ ...onboarding, sex: 'female', heightCm: 165 }, bob.cookie);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Me).user.id).toBe(bob.id);

    expect(await profileRow(alice.id)).toEqual(aliceBefore);
    expect(await profileRow(bob.id)).toMatchObject({ sex: 'female', heightCm: 165 });
    expect(((await (await getMe(alice.cookie)).json()) as Me).profile).toMatchObject({
      sex: 'male',
      heightCm: 180,
    });
  });

  it('deletes the profile with its account', async () => {
    const user = await signUpUser(app);
    await patchMe(onboarding, user.cookie);
    await database.db.delete(schema.user).where(eq(schema.user.id, user.id));
    expect(await profileRow(user.id)).toBeUndefined();
  });
});
