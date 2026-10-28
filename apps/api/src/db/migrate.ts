import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabase } from './client';

export async function runMigrations(databaseUrl: string, migrationsFolder: string): Promise<void> {
  const database = createDatabase(databaseUrl, { max: 1 });
  try {
    await migrate(database.db, { migrationsFolder });
  } finally {
    await database.close();
  }
}
