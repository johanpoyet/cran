import { afterAll, describe, expect, it } from 'vitest';

import { buildTestApp } from '../test/app';
import { migrationsFolder } from '../test/database';
import { createDatabase } from './client';
import { runMigrations } from './migrate';

// postgres.js client and migrator against a real Postgres: CI service container, optional locally.
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('with a real Postgres', () => {
  const url = databaseUrl ?? '';
  const database = createDatabase(url, { max: 2 });

  afterAll(async () => {
    await database.close();
  });

  it('pings the database', async () => {
    await expect(database.ping()).resolves.toBeUndefined();
  });

  it('applies migrations idempotently', async () => {
    await runMigrations(url, migrationsFolder);
    await expect(runMigrations(url, migrationsFolder)).resolves.toBeUndefined();
  });

  it('reports the database as up on /health', async () => {
    const { app } = buildTestApp({ db: database.db, pingDatabase: database.ping });
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ database: { status: 'up' } });
  });

  it('reports the database as down when it is unreachable', async () => {
    const unreachable = createDatabase('postgres://cran:cran@127.0.0.1:1/none', { max: 1 });
    const { app } = buildTestApp({ db: database.db, pingDatabase: unreachable.ping });
    const res = await app.request('/health');
    await unreachable.close();

    expect(res.status).toBe(503);
  });
});
