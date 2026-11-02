import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { createLocalDatabase } from '../test/local-database';
import { readToday } from './today';

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';
// Tuesday 27 October 2026, as on the "Aujourd'hui" mockup; training on Monday.
const tuesday = new Date(2026, 9, 27, 18, 0);
const monday = new Date(2026, 9, 26, 18, 0);

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

function addProfile(userId = alice) {
  db.insert(schema.profiles)
    .values({
      id: `profile-${userId}`,
      userId,
      sex: 'male',
      birthYear: 2005,
      heightCm: 180,
      activityLevel: 3,
      goalRateKgMonth: 1,
      proteinGPerKg: 2.2,
      fatGPerKg: 1.25,
      trainingBonusKcal: 150,
      trainingDays: 0b0000001,
      waterGoalMl: 3000,
      reminders: {
        meal: { enabled: true, time: '14:00' },
        weighIn: { enabled: true, time: '08:00' },
        weeklyReview: { enabled: false, time: '19:00' },
      },
    })
    .run();
}

function addTarget(weekStart: string, targetKcal: number, userId = alice) {
  db.insert(schema.weeklyTargets)
    .values({
      id: `target-${weekStart}-${userId}`,
      userId,
      weekStart,
      maintenanceKcal: targetKcal - 250,
      targetKcal,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      method: 'formula',
      status: 'insufficient_data',
    })
    .run();
}

let entry = 0;
function addEntry(values: {
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  kcal: number;
  at: Date;
  date?: string;
  userId?: string;
  deleted?: boolean;
}) {
  entry += 1;
  db.insert(schema.logEntries)
    .values({
      id: `entry-${String(entry)}`,
      userId: values.userId ?? alice,
      date: values.date ?? '2026-10-27',
      mealType: values.mealType,
      label: 'Aliment',
      kcal: values.kcal,
      proteinG: values.kcal / 20,
      carbsG: values.kcal / 10,
      fatG: values.kcal / 40,
      loggedAt: values.at,
      deletedAt: values.deleted ? new Date() : null,
    })
    .run();
}

describe('readToday', () => {
  it('has no target until the profile and the weekly target are on the phone', () => {
    expect(readToday(db, alice, tuesday).target).toBeNull();
    addProfile();
    expect(readToday(db, alice, tuesday).target).toBeNull();
    addTarget('2026-10-26', 2900);
    expect(readToday(db, alice, tuesday).target).toEqual({
      kcal: 2900,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      surplusKcal: 250,
      trainingDay: false,
    });
  });

  it('adds the training bonus on a training day', () => {
    addProfile();
    addTarget('2026-10-26', 2900);

    expect(readToday(db, alice, monday).target).toMatchObject({ kcal: 3050, trainingDay: true });
  });

  it('uses the latest target that started on or before the day', () => {
    addProfile();
    addTarget('2026-10-19', 2850);
    addTarget('2026-10-26', 2900);
    addTarget('2026-11-02', 2950);

    expect(readToday(db, alice, tuesday).target?.kcal).toBe(2900);
  });

  it("sums the day's entries, by meal, with the time of the first entry", () => {
    addEntry({ mealType: 'breakfast', kcal: 400, at: new Date(2026, 9, 27, 8, 30) });
    addEntry({ mealType: 'breakfast', kcal: 240, at: new Date(2026, 9, 27, 8, 10) });
    addEntry({ mealType: 'lunch', kcal: 820, at: new Date(2026, 9, 27, 12, 45) });

    const { eaten, meals } = readToday(db, alice, tuesday);

    expect(eaten).toEqual({ kcal: 1460, proteinG: 73, carbsG: 146, fatG: 36.5 });
    expect(meals).toEqual([
      { mealType: 'breakfast', count: 2, kcal: 640, firstLoggedAt: new Date(2026, 9, 27, 8, 10) },
      { mealType: 'lunch', count: 1, kcal: 820, firstLoggedAt: new Date(2026, 9, 27, 12, 45) },
      { mealType: 'snack', count: 0, kcal: 0, firstLoggedAt: null },
      { mealType: 'dinner', count: 0, kcal: 0, firstLoggedAt: null },
    ]);
  });

  it("leaves out deleted entries, other days and other users' entries", () => {
    addEntry({ mealType: 'snack', kcal: 300, at: tuesday, deleted: true });
    addEntry({ mealType: 'snack', kcal: 300, at: monday, date: '2026-10-26' });
    addEntry({ mealType: 'snack', kcal: 300, at: tuesday, userId: bob });
    addProfile(bob);
    addTarget('2026-10-26', 2900, bob);

    const today = readToday(db, alice, tuesday);
    expect(today.eaten.kcal).toBe(0);
    expect(today.target).toBeNull();
  });
});
