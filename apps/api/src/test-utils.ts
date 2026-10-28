import { pino } from 'pino';

import { type AppDeps, createApp } from './app';

export const silentLogger = pino({ level: 'silent' });

export function buildTestApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    logger: silentLogger,
    version: 'test',
    pingDatabase: () => Promise.resolve(),
    ...overrides,
  });
}
