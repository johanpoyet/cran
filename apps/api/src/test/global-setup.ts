import { runMigrations } from '../db/migrate';
import { migrationsFolder } from './database';

// With a real Postgres (CI), migrate once before the test files run in parallel.
export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url) await runMigrations(url, migrationsFolder);
}
