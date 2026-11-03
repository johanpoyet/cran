import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { mockFetchFailure, mockFetchResponse } from '../test/fetch';
import { createLocalDatabase } from '../test/local-database';
import { me } from '../test/me';
import { refreshLocalCopy, saveMe } from './local-copy';
import { setWaterGoal } from './settings';

const alice = me.user.id;

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));

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

  it('sends a goal changed on the phone before saving the server copy', async () => {
    saveMe(db, me);
    setWaterGoal(db, alice, 3500);
    const patched = {
      ...me,
      profile: me.profile && {
        ...me.profile,
        waterGoalMl: 3500,
        updatedAt: new Date().toISOString(),
      },
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(me))
      .mockResolvedValueOnce(Response.json(patched));

    await expect(refreshLocalCopy(db)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.test/v1/me',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ waterGoalMl: 3500 }) }),
    );
    expect(db.select().from(schema.profiles).get()?.waterGoalMl).toBe(3500);
  });

  it('takes the server copy when it is newer', async () => {
    saveMe(db, me);
    const newer = {
      ...me,
      profile: me.profile && {
        ...me.profile,
        waterGoalMl: 2500,
        updatedAt: '2030-01-01T00:00:00.000Z',
      },
    };
    const fetchMock = mockFetchResponse(200, newer);

    await refreshLocalCopy(db);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.select().from(schema.profiles).get()?.waterGoalMl).toBe(2500);
  });

  it('keeps the previous copy when offline', async () => {
    saveMe(db, me);
    mockFetchFailure();

    await expect(refreshLocalCopy(db)).resolves.toBe(false);
    expect(db.select().from(schema.weeklyTargets).all()).toHaveLength(1);
  });
});
