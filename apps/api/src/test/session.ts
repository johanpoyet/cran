import { randomUUID } from 'node:crypto';

import type { buildTestApp } from './app';

type App = ReturnType<typeof buildTestApp>['app'];

/** Signs up a new user by email and returns the cookie of its session. */
export async function signUpUser(app: App): Promise<{ id: string; email: string; cookie: string }> {
  const email = `user-${randomUUID()}@example.com`;
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '', email, password: 'correct horse battery' }),
  });
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status}`);
  const { user } = (await res.json()) as { user: { id: string } };
  const cookie = res.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  return { id: user.id, email, cookie };
}
