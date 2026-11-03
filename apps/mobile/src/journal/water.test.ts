import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { saveMe } from '../profile/local-copy';
import { setWaterGoal } from '../profile/settings';
import { createLocalDatabase } from '../test/local-database';
import { me } from '../test/me';
import { readToday } from './today';
import { addWater, deleteWater, readWater } from './water';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = me.user.id;
const bob = '0192f0c0-0000-7000-8000-000000000b0b';
const morning = new Date(2026, 10, 3, 9, 10);

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('water', () => {
  it('adds glasses, one row each, and sums them for the day', () => {
    addWater(db, alice, 250, morning);
    addWater(db, alice, 250, new Date(2026, 10, 3, 11, 0));
    addWater(db, alice, 250, new Date(2026, 10, 2, 22, 0));
    addWater(db, bob, 500, morning);

    const day = readWater(db, alice, '2026-11-03');
    expect(day.totalMl).toBe(500);
    expect(day.logs.map(({ ml, createdAt }) => [ml, createdAt])).toEqual([
      [250, morning],
      [250, new Date(2026, 10, 3, 11, 0)],
    ]);
  });

  it('removes a glass added by mistake, and only the user’s', () => {
    addWater(db, alice, 250, morning);
    const id = readWater(db, alice, '2026-11-03').logs[0]?.id ?? '';

    deleteWater(db, bob, id);
    expect(readWater(db, alice, '2026-11-03').totalMl).toBe(250);

    deleteWater(db, alice, id);
    expect(readWater(db, alice, '2026-11-03')).toEqual({ totalMl: 0, logs: [] });
    expect(db.select().from(schema.waterLogs).get()?.deletedAt).toBeInstanceOf(Date);
  });

  it('shows the water and the goal on "Ta journée"', () => {
    saveMe(db, me);
    addWater(db, alice, 250, morning);

    expect(readToday(db, alice, morning).water).toEqual({ totalMl: 250, goalMl: 3000 });
  });

  it('changes the goal on the phone, newer than the server copy', () => {
    saveMe(db, me);
    setWaterGoal(db, alice, 3500);

    const profile = db.select().from(schema.profiles).get();
    expect(profile?.waterGoalMl).toBe(3500);
    expect(profile?.updatedAt.getTime()).toBeGreaterThan(Date.parse(me.profile?.updatedAt ?? ''));
  });
});
