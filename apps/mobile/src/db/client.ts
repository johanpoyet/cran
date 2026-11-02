import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'cran.db';

const expoDatabase = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
// WAL lets the UI read while a write (sync, import) is running; SQLite ignores foreign keys unless
// asked.
expoDatabase.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

/** The app reads and writes this database first (local-first, spec section 3). */
export const localDb = drizzle(expoDatabase, { schema });
