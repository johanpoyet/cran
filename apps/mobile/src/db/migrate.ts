import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from './migrations';
import type * as schema from './schema';
import type { LocalDatabase } from './types';

/**
 * Applies the migrations embedded in the bundle that the database has not seen yet. Drizzle's
 * migrator only uses the SQLite dialect of the database, so it also runs on sql.js in the tests.
 */
export async function migrateLocalDatabase(db: LocalDatabase): Promise<void> {
  await migrate(db as ExpoSQLiteDatabase<typeof schema>, migrations);
}
