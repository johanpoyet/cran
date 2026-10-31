import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

const secret = 'x'.repeat(32);
const minimal = { DATABASE_URL: 'postgres://localhost/cran', BETTER_AUTH_SECRET: secret };

describe('loadEnv', () => {
  it('applies defaults', () => {
    expect(loadEnv(minimal)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgres://localhost/cran',
      LOG_LEVEL: 'info',
      APP_VERSION: 'dev',
      BETTER_AUTH_URL: 'http://localhost:3000',
      BETTER_AUTH_SECRET: secret,
      APPLE_APP_BUNDLE_IDENTIFIER: 'fr.johanpoyet.cran',
      GOOGLE_CLIENT_IDS: undefined,
    });
  });

  it('coerces the port', () => {
    expect(loadEnv({ ...minimal, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails fast without DATABASE_URL', () => {
    expect(() => loadEnv({ BETTER_AUTH_SECRET: secret })).toThrow(/DATABASE_URL/);
  });

  it('requires an auth secret of at least 32 characters', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgres://x' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadEnv({ ...minimal, BETTER_AUTH_SECRET: 'too-short' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('treats empty provider settings as absent', () => {
    expect(loadEnv({ ...minimal, GOOGLE_CLIENT_IDS: '' }).GOOGLE_CLIENT_IDS).toBeUndefined();
  });

  it('rejects an unknown log level', () => {
    expect(() => loadEnv({ ...minimal, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});
