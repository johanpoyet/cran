// The local database on sql.js (SQLite compiled to WebAssembly), migrated like on the phone.
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import { migrateLocalDatabase } from '../db/migrate';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

export function createRawDatabase(): Promise<LocalDatabase> {
  return initSqlJs().then((SQL) => {
    const client = new SQL.Database();
    client.run('PRAGMA foreign_keys = ON;');
    return drizzle(client, { schema });
  });
}

export async function createLocalDatabase(): Promise<LocalDatabase> {
  const db = await createRawDatabase();
  await migrateLocalDatabase(db);
  return db;
}
