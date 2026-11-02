import type { Me } from '@cran/shared';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { mockFetchFailure, mockFetchResponse } from '../test/fetch';
import { createLocalDatabase } from '../test/local-database';
import { refreshLocalCopy, saveMe } from './local-copy';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));

const me: Me = {
  user: { id: '0192f0c0-0000-7000-8000-00000000a11c', email: 'johan@example.com' },
  profile: {
    id: '0195f2a4-9f3e-7c3a-8f2b-000000000001',
    sex: 'male',
    birthYear: 2005,
    heightCm: 180,
    activityLevel: 3,
    goalRateKgMonth: 1,
    proteinGPerKg: 2.2,
    fatGPerKg: 1.25,
    trainingBonusKcal: 150,
    trainingDays: 53,
    waterGoalMl: 3000,
    reminders: {
      meal: { enabled: true, time: '14:00' },
      weighIn: { enabled: true, time: '08:00' },
      weeklyReview: { enabled: false, time: '19:00' },
    },
    healthDataConsentAt: '2026-10-31T10:00:00.000Z',
    updatedAt: '2026-10-31T10:00:00.000Z',
  },
  weeklyTarget: {
    id: '0195f2a4-9f3e-7c3a-8f2b-000000000002',
    weekStart: '2026-10-26',
    maintenanceKcal: 2650,
    targetKcal: 2900,
    proteinG: 150,
    carbsG: 381,
    fatG: 86,
    method: 'formula',
    status: 'insufficient_data',
  },
};

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
  jest.restoreAllMocks();
});

describe('saveMe', () => {
  it('copies the profile and the weekly target with their server ids', () => {
    saveMe(db, me);

    expect(db.select().from(schema.profiles).all()).toEqual([
      expect.objectContaining({
        id: me.profile?.id,
        userId: me.user.id,
        trainingDays: 53,
        updatedAt: new Date('2026-10-31T10:00:00.000Z'),
        healthDataConsentAt: new Date('2026-10-31T10:00:00.000Z'),
      }),
    ]);
    expect(db.select().from(schema.weeklyTargets).all()).toEqual([
      expect.objectContaining({ id: me.weeklyTarget?.id, userId: me.user.id, targetKcal: 2900 }),
    ]);
  });

  it('updates the copy in place', () => {
    saveMe(db, me);
    saveMe(db, {
      ...me,
      profile: me.profile && { ...me.profile, trainingDays: 1 },
      weeklyTarget: me.weeklyTarget && { ...me.weeklyTarget, targetKcal: 2950 },
    });

    expect(db.select().from(schema.profiles).all()).toHaveLength(1);
    expect(db.select().from(schema.profiles).get()?.trainingDays).toBe(1);
    expect(db.select().from(schema.weeklyTargets).get()?.targetKcal).toBe(2950);
  });

  it('writes nothing before the onboarding', () => {
    saveMe(db, { ...me, profile: null, weeklyTarget: null });

    expect(db.select().from(schema.profiles).all()).toEqual([]);
    expect(db.select().from(schema.weeklyTargets).all()).toEqual([]);
  });
});

describe('refreshLocalCopy', () => {
  it('fetches /v1/me and saves it', async () => {
    const fetchMock = mockFetchResponse(200, me);

    await expect(refreshLocalCopy(db)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/v1/me', expect.anything());
    expect(db.select().from(schema.weeklyTargets).all()).toHaveLength(1);
  });

  it('keeps the previous copy when offline', async () => {
    saveMe(db, me);
    mockFetchFailure();

    await expect(refreshLocalCopy(db)).resolves.toBe(false);
    expect(db.select().from(schema.weeklyTargets).all()).toHaveLength(1);
  });
});
