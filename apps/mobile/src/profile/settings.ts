import { and, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

/**
 * Changes the daily water goal on the phone. The profile's `updated_at` moves, so that the next
 * refresh sends it to the server instead of overwriting it (last write wins).
 */
export function setWaterGoal(db: LocalDatabase, userId: string, waterGoalMl: number): void {
  db.update(schema.profiles)
    .set({ waterGoalMl, updatedAt: new Date() })
    .where(and(eq(schema.profiles.userId, userId), isNull(schema.profiles.deletedAt)))
    .run();
  notifyLocalChange();
}
