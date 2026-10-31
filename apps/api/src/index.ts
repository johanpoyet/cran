import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';

import { createApp } from './app';
import { createAuth } from './auth';
import { createDatabase } from './db/client';
import { loadEnv } from './env';
import { createLogger } from './logger';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const database = createDatabase(env.DATABASE_URL);

const auth = createAuth({ db: database.db, env, logger });

const app = createApp({
  logger,
  auth,
  db: database.db,
  version: env.APP_VERSION,
  pingDatabase: database.ping,
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port, version: env.APP_VERSION }, 'server listening');
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  server.close();
  await database.close();
  await Sentry.close(2000);
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => void shutdown(signal));
}
