// Test database: the real Postgres of DATABASE_URL when set (CI), otherwise an in-memory PGlite.
import { fileURLToPath } from 'node:url';

import type { AppDatabase } from '../db/client';
import { createDatabase } from '../db/client';
import * as schema from '../db/schema';

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export interface TestDatabase {
  db: AppDatabase;
  ping: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Migrations already ran once in the global setup.
    return createDatabase(url, { max: 4 });
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  const { unaccent } = await import('@electric-sql/pglite/contrib/unaccent');
  // Extensions created by the migrations must be bundled into PGlite first.
  const client = new PGlite({ extensions: { pg_trgm, unaccent } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return {
    db,
    ping: async () => {
      await client.query('select 1');
    },
    close: () => client.close(),
  };
}
