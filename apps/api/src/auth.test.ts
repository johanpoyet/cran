import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { socialProviders } from './auth';
import * as schema from './db/schema';
import { buildTestApp, testAuthEnv } from './test/app';
import { createTestDatabase, type TestDatabase } from './test/database';

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

const password = 'correct horse battery';

function uniqueEmail(): string {
  return `user-${randomUUID()}@example.com`;
}

type App = ReturnType<typeof buildTestApp>['app'];

function post(app: App, path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/** "name=value" pairs of the Set-Cookie headers, ready for a Cookie header. */
function cookiesOf(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

async function signUp(app: App, email = uniqueEmail()) {
  const res = await post(app, '/api/auth/sign-up/email', { name: 'Johan', email, password });
  return { res, email, cookie: cookiesOf(res) };
}

async function getSession(app: App, cookie: string) {
  const res = await app.request('/api/auth/get-session', { headers: { cookie } });
  return (await res.json()) as { user: { id: string; email: string } } | null;
}

describe('sign-up with email', () => {
  it('creates the user, hashes the password and opens a session', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { res, email, cookie } = await signUp(app);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(body.user.email).toBe(email);
    expect(body.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(cookie).toContain('better-auth.session_token=');

    const [account] = await database.db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, body.user.id));
    expect(account?.providerId).toBe('credential');
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(password);

    expect((await getSession(app, cookie))?.user.email).toBe(email);
  });

  it('refuses an email that is already registered', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { email } = await signUp(app);
    const { res } = await signUp(app, email);

    expect(res.status).toBe(422);
  });

  it.each([
    [
      'a password shorter than 8 characters',
      { name: 'Johan', email: uniqueEmail(), password: 'short' },
    ],
    ['an invalid email', { name: 'Johan', email: 'not-an-email', password }],
    ['a missing name', { email: uniqueEmail(), password }],
  ])('rejects %s', async (_, body) => {
    const { app } = buildTestApp({ db: database.db });
    const res = await post(app, '/api/auth/sign-up/email', body);

    expect(res.status).toBe(400);
  });
});

describe('sign-in with email', () => {
  it('opens a session with the right password', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { email } = await signUp(app);
    const res = await post(app, '/api/auth/sign-in/email', { email, password });

    expect(res.status).toBe(200);
    expect((await getSession(app, cookiesOf(res)))?.user.email).toBe(email);
  });

  it('refuses a wrong password', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { email } = await signUp(app);
    const res = await post(app, '/api/auth/sign-in/email', { email, password: 'wrong password' });

    expect(res.status).toBe(401);
    expect(cookiesOf(res)).not.toContain('session_token=');
  });

  it('refuses an unknown email with the same answer', async () => {
    const { app } = buildTestApp({ db: database.db });
    const res = await post(app, '/api/auth/sign-in/email', { email: uniqueEmail(), password });

    expect(res.status).toBe(401);
  });
});

describe('protected /v1 routes', () => {
  it('reject requests without a session', async () => {
    const { app } = buildTestApp({ db: database.db });
    const res = await app.request('/v1/me');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' },
    });
  });

  it('let an authenticated request through', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { cookie } = await signUp(app);
    const res = await app.request('/v1/does-not-exist', { headers: { cookie } });

    // Past the session check, the unknown route is a 404.
    expect(res.status).toBe(404);
  });

  it('reject a forged session token', async () => {
    const { app } = buildTestApp({ db: database.db });
    const res = await app.request('/v1/me', {
      headers: { cookie: 'better-auth.session_token=forged.value' },
    });

    expect(res.status).toBe(401);
  });
});

describe('session lifecycle', () => {
  it('rejects an expired session', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { res, cookie } = await signUp(app);
    const { user } = (await res.json()) as { user: { id: string } };

    await database.db
      .update(schema.session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.session.userId, user.id));

    expect(await getSession(app, cookie)).toBeNull();
    expect((await app.request('/v1/me', { headers: { cookie } })).status).toBe(401);
  });

  it('lasts 30 days', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { res } = await signUp(app);
    const { user } = (await res.json()) as { user: { id: string } };

    const [row] = await database.db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, user.id));
    const days = ((row?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('revokes the session on sign-out', async () => {
    const { app } = buildTestApp({ db: database.db });
    const { cookie } = await signUp(app);

    const res = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: 'cran://' },
    });

    expect(res.status).toBe(200);
    expect((await app.request('/v1/me', { headers: { cookie } })).status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('blocks the 6th sign-in attempt within a minute from the same IP', async () => {
    const { app } = buildTestApp({ db: database.db, rateLimit: true });
    const email = uniqueEmail();
    const attempt = (ip: string) =>
      post(app, '/api/auth/sign-in/email', { email, password }, { 'x-real-ip': ip });

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt('203.0.113.7')).status).toBe(401);
    }
    expect((await attempt('203.0.113.7')).status).toBe(429);

    // Another client is not affected.
    expect((await attempt('198.51.100.20')).status).toBe(401);
  });

  it('limits sign-ups to 3 per minute per IP', async () => {
    const { app } = buildTestApp({ db: database.db, rateLimit: true });
    const attempt = () =>
      post(
        app,
        '/api/auth/sign-up/email',
        { name: 'Johan', email: uniqueEmail(), password },
        { 'x-real-ip': '203.0.113.8' },
      );

    for (let i = 0; i < 3; i += 1) {
      expect((await attempt()).status).toBe(200);
    }
    expect((await attempt()).status).toBe(429);
  });
});

describe('social providers', () => {
  it('reject an Apple id token that is not signed by Apple', async () => {
    const { app } = buildTestApp({ db: database.db });
    const res = await post(app, '/api/auth/sign-in/social', {
      provider: 'apple',
      idToken: { token: 'not-a-jwt' },
    });

    expect(res.status).toBe(401);
  });

  it('keep Google disabled until its client ids are configured', async () => {
    const { app } = buildTestApp({ db: database.db });
    const res = await post(app, '/api/auth/sign-in/social', {
      provider: 'google',
      idToken: { token: 'not-a-jwt' },
    });

    expect(res.status).toBe(404);
    expect(socialProviders(testAuthEnv)?.google).toBeUndefined();
  });

  it('accept native Apple id tokens issued for the bundle id', () => {
    expect(socialProviders(testAuthEnv)?.apple).toMatchObject({
      clientId: 'fr.johanpoyet.cran',
      appBundleIdentifier: 'fr.johanpoyet.cran',
    });
  });

  it('enable Google with every client id (web, iOS, Android)', () => {
    const providers = socialProviders({
      ...testAuthEnv,
      GOOGLE_CLIENT_IDS: 'web.apps.googleusercontent.com, ios.apps.googleusercontent.com',
    });
    expect(providers?.google).toMatchObject({
      clientId: ['web.apps.googleusercontent.com', 'ios.apps.googleusercontent.com'],
    });
  });
});
