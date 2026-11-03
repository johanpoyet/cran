import {
  isSyncTable,
  SYNC_BATCH_MAX,
  type SyncPushResult,
  type SyncRejectReason,
  type SyncTable,
} from '@cran/shared';
import { and, asc, count, eq, sql } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { Sentry } from '../lib/sentry';
import { LOCAL_TABLES, toWire } from './tables';

export interface QueuedChange {
  table: SyncTable;
  id: string;
  /** Version of the queued change when it was read: a later change keeps it in the queue. */
  version: number;
  row: Record<string, unknown>;
}

/** Refusals worth trying again (a referenced row pushed later, a clock set right later). */
const RETRIED: readonly SyncRejectReason[] = ['unknown_reference', 'future_timestamp'];
export const MAX_ATTEMPTS = 5;

export function pendingCount(db: LocalDatabase): number {
  return db.select({ value: count() }).from(schema.pendingChanges).get()?.value ?? 0;
}

/** The oldest queued changes with their current rows; rows gone from the phone leave the queue. */
export function readBatch(db: LocalDatabase, limit = SYNC_BATCH_MAX): QueuedChange[] {
  const queued = db
    .select()
    .from(schema.pendingChanges)
    .orderBy(asc(schema.pendingChanges.queuedAt))
    .limit(limit)
    .all();
  const batch: QueuedChange[] = [];
  for (const entry of queued) {
    const table = entry.tableName;
    const local = isSyncTable(table) ? LOCAL_TABLES[table] : undefined;
    const row = local
      ? (db.select().from(local).where(eq(local.id, entry.rowId)).get() as
          Record<string, unknown> | undefined)
      : undefined;
    if (!isSyncTable(table) || !row) {
      remove(db, entry.tableName, entry.rowId, entry.version);
      continue;
    }
    batch.push({ table, id: entry.rowId, version: entry.version, row: toWire(table, row) });
  }
  return batch;
}

function remove(db: LocalDatabase, table: string, id: string, version: number): void {
  db.delete(schema.pendingChanges)
    .where(
      and(
        eq(schema.pendingChanges.tableName, table),
        eq(schema.pendingChanges.rowId, id),
        eq(schema.pendingChanges.version, version),
      ),
    )
    .run();
}

/**
 * Updates the queue after a push. Accepted rows leave it, unless changed again during the push.
 * A row refused because the server has newer data leaves it (the pull brings that data); a refusal
 * that may pass later is retried a few times; any other refusal is reported and dropped.
 * Returns how many changes left the queue.
 */
export function settle(
  db: LocalDatabase,
  batch: readonly QueuedChange[],
  result: SyncPushResult,
): number {
  const byId = new Map(batch.map((change) => [change.id, change]));
  let settled = 0;
  db.transaction((tx) => {
    for (const id of result.accepted) {
      const change = byId.get(id);
      if (change) {
        remove(tx, change.table, id, change.version);
        settled += 1;
      }
    }
    for (const { id, reason } of result.rejected) {
      const change = byId.get(id);
      if (!change) continue;
      if (RETRIED.includes(reason)) {
        const [entry] = tx
          .update(schema.pendingChanges)
          .set({ attempts: sql`${schema.pendingChanges.attempts} + 1` })
          .where(
            and(
              eq(schema.pendingChanges.tableName, change.table),
              eq(schema.pendingChanges.rowId, id),
            ),
          )
          .returning({ attempts: schema.pendingChanges.attempts })
          .all();
        if ((entry?.attempts ?? MAX_ATTEMPTS) < MAX_ATTEMPTS) continue;
      }
      if (reason !== 'stale') {
        Sentry.captureMessage(`Sync push refused: ${change.table} ${reason}`, 'warning');
      }
      remove(tx, change.table, id, change.version);
      settled += 1;
    }
  });
  return settled;
}
