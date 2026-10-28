import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://localhost/cran' });
    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgres://localhost/cran',
      LOG_LEVEL: 'info',
      APP_VERSION: 'dev',
    });
  });

  it('coerces the port', () => {
    expect(loadEnv({ DATABASE_URL: 'postgres://x', PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails fast without DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an unknown log level', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgres://x', LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});
