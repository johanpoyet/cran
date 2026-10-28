// Applies Drizzle migrations; run by the container before the server starts.
import { fileURLToPath } from 'node:url';

import { runMigrations } from './db/migrate';
import { loadEnv } from './env';
import { createLogger } from './logger';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

try {
  await runMigrations(env.DATABASE_URL, fileURLToPath(new URL('../drizzle', import.meta.url)));
  logger.info('migrations applied');
} catch (error) {
  logger.fatal({ err: error }, 'migrations failed');
  process.exit(1);
}
