import { pino } from 'pino';

import { type AppDeps, createApp } from '../app';
import { type AuthEnv, createAuth } from '../auth';
import type { AppDatabase } from '../db/client';

export const silentLogger = pino({ level: 'silent' });

export const testAuthEnv: AuthEnv = {
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-for-better-auth',
  APPLE_APP_BUNDLE_IDENTIFIER: 'fr.johanpoyet.cran',
  GOOGLE_CLIENT_IDS: undefined,
};

export interface TestAppOptions extends Partial<Omit<AppDeps, 'auth' | 'db'>> {
  db: AppDatabase;
  rateLimit?: boolean;
}

export function buildTestApp({ db, rateLimit = false, ...overrides }: TestAppOptions) {
  const auth = createAuth({ db, env: testAuthEnv, logger: silentLogger, rateLimit });
  const app = createApp({
    logger: silentLogger,
    auth,
    db,
    version: 'test',
    pingDatabase: () => Promise.resolve(),
    ...overrides,
  });
  return { app, auth };
}
