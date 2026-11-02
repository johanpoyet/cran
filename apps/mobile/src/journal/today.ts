import { type DayTarget, dayTarget, localDateKey, MEAL_TYPES, type MealType } from '@cran/shared';
import { and, desc, eq, isNull, lte } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

export type { MealType };

export interface Nutrition {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealSummary {
  mealType: MealType;
  count: number;
  kcal: number;
  /** Time of the first entry of the meal ("8h10"). */
  firstLoggedAt: Date | null;
}

export interface TodaySummary {
  /** Null until the profile and the target have reached the phone. */
  target: DayTarget | null;
  eaten: Nutrition;
  meals: MealSummary[];
}

/** Everything the "Ta journée" screen shows for a local day, read from SQLite. */
export function readToday(db: LocalDatabase, userId: string, date: Date): TodaySummary {
  const day = localDateKey(date);
  const profile = db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.userId, userId), isNull(schema.profiles.deletedAt)))
    .get();
  // The target in force: the latest one that started on or before this day.
  const week = db
    .select()
    .from(schema.weeklyTargets)
    .where(
      and(
        eq(schema.weeklyTargets.userId, userId),
        isNull(schema.weeklyTargets.deletedAt),
        lte(schema.weeklyTargets.weekStart, day),
      ),
    )
    .orderBy(desc(schema.weeklyTargets.weekStart))
    .get();
  const entries = db
    .select()
    .from(schema.logEntries)
    .where(
      and(
        eq(schema.logEntries.userId, userId),
        eq(schema.logEntries.date, day),
        isNull(schema.logEntries.deletedAt),
      ),
    )
    .all();

  const eaten: Nutrition = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const entry of entries) {
    eaten.kcal += entry.kcal;
    eaten.proteinG += entry.proteinG;
    eaten.carbsG += entry.carbsG;
    eaten.fatG += entry.fatG;
  }

  const meals = MEAL_TYPES.map((mealType) => {
    const ofMeal = entries.filter((entry) => entry.mealType === mealType);
    const times = ofMeal.map((entry) => entry.loggedAt.getTime());
    return {
      mealType,
      count: ofMeal.length,
      kcal: ofMeal.reduce((total, entry) => total + entry.kcal, 0),
      firstLoggedAt: times.length > 0 ? new Date(Math.min(...times)) : null,
    };
  });

  return {
    target: profile && week ? dayTarget(week, profile, date) : null,
    eaten,
    meals,
  };
}
