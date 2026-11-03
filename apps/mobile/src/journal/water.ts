import { localDateKey } from '@cran/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import { newId } from '../db/id';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

export type WaterLog = typeof schema.waterLogs.$inferSelect;

export interface WaterDay {
  totalMl: number;
  /** One row per glass added, oldest first. */
  logs: WaterLog[];
}

/** Water drunk on a local day. */
export function readWater(db: LocalDatabase, userId: string, date: string): WaterDay {
  const logs = db
    .select()
    .from(schema.waterLogs)
    .where(
      and(
        eq(schema.waterLogs.userId, userId),
        eq(schema.waterLogs.date, date),
        isNull(schema.waterLogs.deletedAt),
      ),
    )
    .orderBy(asc(schema.waterLogs.createdAt))
    .all();
  return { totalMl: logs.reduce((total, log) => total + log.ml, 0), logs };
}

/** Adds a glass (one row per addition, spec section 4). */
export function addWater(db: LocalDatabase, userId: string, ml: number, at: Date): void {
  db.insert(schema.waterLogs)
    .values({ id: newId(), userId, date: localDateKey(at), ml, createdAt: at, updatedAt: at })
    .run();
  notifyLocalChange();
}

/** Removes a glass added by mistake (soft delete, for the sync). */
export function deleteWater(db: LocalDatabase, userId: string, id: string): void {
  const now = new Date();
  db.update(schema.waterLogs)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.waterLogs.id, id),
        eq(schema.waterLogs.userId, userId),
        isNull(schema.waterLogs.deletedAt),
      ),
    )
    .run();
  notifyLocalChange();
}
