import { createMiddleware } from 'hono/factory';

import type { Auth, AuthSession } from '../auth';
import { errorBody } from '../errors';

export interface SessionVariables {
  user: AuthSession['user'];
  session: AuthSession['session'];
}

/** Rejects requests without a valid, unexpired session; exposes the user to the handlers. */
export function requireSession(auth: Auth) {
  return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result) {
      return c.json(errorBody('unauthorized', 'Authentication required'), 401);
    }
    c.set('user', result.user);
    c.set('session', result.session);
    await next();
    return undefined;
  });
}
