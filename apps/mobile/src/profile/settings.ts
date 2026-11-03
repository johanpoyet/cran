import { and, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

/**
 * Changes the daily water goal on the phone; the sync sends the profile to the server (its
 * `updated_at` moves, so it wins over the server's older version).
 */
export function setWaterGoal(db: LocalDatabase, userId: string, waterGoalMl: number): void {
  db.update(schema.profiles)
    .set({ waterGoalMl, updatedAt: new Date() })
    .where(and(eq(schema.profiles.userId, userId), isNull(schema.profiles.deletedAt)))
    .run();
  notifyLocalChange();
}
