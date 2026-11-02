import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Key-value settings of the local database itself (owner of the data, later the sync cursor). */
export const localMeta = sqliteTable('local_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
