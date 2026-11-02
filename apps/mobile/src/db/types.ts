import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/** The local database: expo-sqlite on the phone, sql.js in the tests (both synchronous). */
export type LocalDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
