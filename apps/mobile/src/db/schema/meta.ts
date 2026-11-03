import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Key-value settings of the local database itself (owner of the data, later the sync cursor). */
export const localMeta = sqliteTable('local_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * Rows changed on the phone and not yet accepted by the server (spec section 5), filled by SQLite
 * triggers on every synchronised table. The push reads the current row: one entry per row, its
 * `version` going up at each new change so that a change made during a push is not lost.
 */
export const pendingChanges = sqliteTable(
  'pending_changes',
  {
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    version: integer('version').notNull().default(1),
    /** Pushes refused for a reason that may pass later (unknown reference, clock ahead). */
    attempts: integer('attempts').notNull().default(0),
    queuedAt: integer('queued_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.tableName, table.rowId] })],
);
