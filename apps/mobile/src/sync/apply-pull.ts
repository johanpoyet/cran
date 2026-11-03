import { type SyncPullResult, syncRowSchemas } from '@cran/shared';
import { and, eq } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { Sentry } from '../lib/sentry';
import { fromWire, LOCAL_TABLES } from './tables';

const APPLYING = 'applying_pull';
const CURSOR = 'sync_cursor';

export function readCursor(db: LocalDatabase): number {
  const row = db
    .select({ value: schema.localMeta.value })
    .from(schema.localMeta)
    .where(eq(schema.localMeta.key, CURSOR))
    .get();
  return row ? Number(row.value) : 0;
}

/**
 * Writes a pulled page into the local tables, then the new cursor, in one transaction. The flag
 * keeps the sync triggers from queueing these rows again. A local change not pushed yet and newer
 * than the pulled row is kept (it will win on the server too); otherwise the pulled row wins.
 */
export function applyPull(db: LocalDatabase, page: SyncPullResult): void {
  db.transaction((tx) => {
    tx.insert(schema.localMeta).values({ key: APPLYING, value: '1' }).onConflictDoNothing().run();
    for (const { table, row } of page.changes) {
      const parsed = syncRowSchemas[table].safeParse(row);
      if (!parsed.success) {
        Sentry.captureMessage(`Sync pull: invalid ${table} row`, 'warning');
        continue;
      }
      const values = fromWire(table, parsed.data) as Record<string, unknown> & {
        id: string;
        updatedAt: Date;
      };
      const local = LOCAL_TABLES[table];
      const queued = tx
        .select({ version: schema.pendingChanges.version })
        .from(schema.pendingChanges)
        .where(
          and(
            eq(schema.pendingChanges.tableName, table),
            eq(schema.pendingChanges.rowId, values.id),
          ),
        )
        .get();
      if (queued) {
        const current = tx
          .select({ updatedAt: local.updatedAt })
          .from(local)
          .where(eq(local.id, values.id))
          .get() as { updatedAt: Date } | undefined;
        if (current && current.updatedAt.getTime() > values.updatedAt.getTime()) continue;
        tx.delete(schema.pendingChanges)
          .where(
            and(
              eq(schema.pendingChanges.tableName, table),
              eq(schema.pendingChanges.rowId, values.id),
            ),
          )
          .run();
      }
      tx.insert(local).values(values).onConflictDoUpdate({ target: local.id, set: values }).run();
    }
    tx.insert(schema.localMeta)
      .values({ key: CURSOR, value: String(page.cursor) })
      .onConflictDoUpdate({ target: schema.localMeta.key, set: { value: String(page.cursor) } })
      .run();
    tx.delete(schema.localMeta).where(eq(schema.localMeta.key, APPLYING)).run();
  });
}
