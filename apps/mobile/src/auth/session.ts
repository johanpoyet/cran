import { useState } from 'react';

import { authClient } from './client';

/**
 * Where the user stands: signed out, signed in but not onboarded yet, or ready to use the app.
 * "loading" only happens before the first answer: later refreshes keep the current screen.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'onboarding' | 'ready';

/**
 * Signed in while a session is known: the cached one at launch (offline included), then the one
 * confirmed by the API. A revoked or expired session comes back empty and signs the user out.
 * The onboarding date travels with the session, so routing works offline too.
 */
export function useAuthStatus(): AuthStatus {
  const { data, isPending } = authClient.useSession();
  const [settled, setSettled] = useState(false);
  if (!settled && (data !== null || !isPending)) setSettled(true);
  if (data) return data.user.onboardedAt ? 'ready' : 'onboarding';
  return settled || !isPending ? 'signedOut' : 'loading';
}
