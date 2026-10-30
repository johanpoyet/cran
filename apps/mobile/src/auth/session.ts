import { useState } from 'react';

import { authClient } from './client';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/**
 * Signed in while a session is known: the cached one at launch (offline included), then the one
 * confirmed by the API. A revoked or expired session comes back empty and signs the user out.
 * "loading" only happens before the first answer: later refreshes keep the current screen.
 */
export function useAuthStatus(): AuthStatus {
  const { data, isPending } = authClient.useSession();
  const [settled, setSettled] = useState(false);
  if (!settled && (data !== null || !isPending)) setSettled(true);
  if (data) return 'signedIn';
  return settled || !isPending ? 'signedOut' : 'loading';
}
