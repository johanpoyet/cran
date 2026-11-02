import { defineConfig } from 'drizzle-kit';

// SQLite schema of the device. `pnpm db:generate` writes the SQL migrations, then embeds them in
// src/db/migrations.ts for the app bundle and the tests.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
});
