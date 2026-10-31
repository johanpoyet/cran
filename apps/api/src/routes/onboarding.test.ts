import type { OnboardingResult } from '@cran/shared';
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

// Answers of the onboarding mockups, on Saturday 31 October 2026.
const answers = {
  sex: 'male',
  birthYear: 2005,
  heightCm: 180,
  activityLevel: 3,
  goalRateKgMonth: 1,
  trainingDays: 0b0110101,
  trainingBonusKcal: 150,
  weightKg: 68.4,
  date: '2026-10-31',
  healthDataConsent: true,
};

function postOnboarding(body: unknown, cookie?: string) {
  return app.request('/v1/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function rowsOf(userId: string) {
  return Promise.all([
    database.db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)),
    database.db.select().from(schema.weighIns).where(eq(schema.weighIns.userId, userId)),
    database.db.select().from(schema.weeklyTargets).where(eq(schema.weeklyTargets.userId, userId)),
  ]);
}

describe('POST /v1/onboarding', () => {
  it('saves the profile, the first weigh-in and the starting target of the mockup', async () => {
    const user = await signUpUser(app);
    const res = await postOnboarding(answers, user.cookie);

    expect(res.status).toBe(201);
    const result = (await res.json()) as OnboardingResult;
    expect(result.weeklyTarget).toEqual({
      weekStart: '2026-10-26',
      maintenanceKcal: 2650,
      targetKcal: 2900,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      method: 'formula',
      status: 'insufficient_data',
    });
    expect(result.profile).toMatchObject({
      sex: 'male',
      heightCm: 180,
      trainingDays: 0b0110101,
      trainingBonusKcal: 150,
      proteinGPerKg: 2.2,
      healthDataConsentAt: expect.any(String) as string,
    });

    const [profiles, weighIns, targets] = await rowsOf(user.id);
    expect(profiles).toHaveLength(1);
    expect(weighIns).toMatchObject([{ date: '2026-10-31', weightKg: 68.4, source: 'manual' }]);
    expect(targets).toHaveLength(1);
  });

  it('marks the account as onboarded in its session', async () => {
    const user = await signUpUser(app);
    await postOnboarding(answers, user.cookie);

    const res = await app.request('/api/auth/get-session', { headers: { cookie: user.cookie } });
    const session = (await res.json()) as { user: { onboardedAt: string | null } };
    expect(session.user.onboardedAt).toEqual(expect.any(String));
  });

  it('can only be done once', async () => {
    const user = await signUpUser(app);
    await postOnboarding(answers, user.cookie);
    const res = await postOnboarding({ ...answers, weightKg: 70 }, user.cookie);

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: 'already_onboarded' } });
    const [, weighIns, targets] = await rowsOf(user.id);
    expect(weighIns).toHaveLength(1);
    expect(targets).toHaveLength(1);
  });

  it('writes nothing when the profile already exists', async () => {
    const user = await signUpUser(app);
    await app.request('/v1/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: user.cookie },
      body: JSON.stringify({
        sex: 'male',
        birthYear: 2005,
        heightCm: 180,
        activityLevel: 3,
        goalRateKgMonth: 1,
      }),
    });

    expect((await postOnboarding(answers, user.cookie)).status).toBe(409);
    const [, weighIns, targets] = await rowsOf(user.id);
    expect(weighIns).toHaveLength(0);
    expect(targets).toHaveLength(0);
  });

  it('requires the health data consent', async () => {
    const user = await signUpUser(app);
    const res = await postOnboarding({ ...answers, healthDataConsent: false }, user.cookie);

    expect(res.status).toBe(400);
    const [profiles] = await rowsOf(user.id);
    expect(profiles).toHaveLength(0);
  });

  it.each([
    ['a missing answer', { ...answers, sex: undefined }],
    ['an impossible weight', { ...answers, weightKg: 500 }],
    ['an invalid day', { ...answers, date: '2026-02-30' }],
    ['an unknown field', { ...answers, userId: '00000000-0000-0000-0000-000000000000' }],
  ])('rejects %s', async (_, body) => {
    const user = await signUpUser(app);
    const res = await postOnboarding(body, user.cookie);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'validation_error' } });
  });

  it('requires a session', async () => {
    expect((await postOnboarding(answers)).status).toBe(401);
  });

  it('only writes the rows of the session user', async () => {
    const alice = await signUpUser(app);
    const bob = await signUpUser(app);
    await postOnboarding(answers, alice.cookie);

    expect(await rowsOf(bob.id)).toEqual([[], [], []]);
    expect((await postOnboarding({ ...answers, weightKg: 80 }, bob.cookie)).status).toBe(201);

    const [, aliceWeighIns] = await rowsOf(alice.id);
    const [, bobWeighIns] = await rowsOf(bob.id);
    expect(aliceWeighIns).toMatchObject([{ weightKg: 68.4 }]);
    expect(bobWeighIns).toMatchObject([{ weightKg: 80 }]);
  });
});
