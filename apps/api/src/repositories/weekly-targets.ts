import type { WeeklyTarget } from '@cran/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '../db/client';
import { weeklyTargets } from '../db/schema';

type WeeklyTargetRow = typeof weeklyTargets.$inferSelect;

/** Every query is scoped to the session's user. */
export function createWeeklyTargetRepository(db: AppDatabase) {
  /** The most recent target, the one in force (one row per week, from the onboarding on). */
  async function latest(userId: string): Promise<WeeklyTarget | null> {
    const [row] = await db
      .select()
      .from(weeklyTargets)
      .where(and(eq(weeklyTargets.userId, userId), isNull(weeklyTargets.deletedAt)))
      .orderBy(desc(weeklyTargets.weekStart))
      .limit(1);
    return row ? toWeeklyTarget(row) : null;
  }

  return { latest };
}

export type WeeklyTargetRepository = ReturnType<typeof createWeeklyTargetRepository>;

export function toWeeklyTarget(row: WeeklyTargetRow): WeeklyTarget {
  return {
    id: row.id,
    weekStart: row.weekStart,
    maintenanceKcal: row.maintenanceKcal,
    targetKcal: row.targetKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    method: row.method,
    status: row.status,
  };
}
