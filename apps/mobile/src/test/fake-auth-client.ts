// Stand-in for src/auth/client in tests: the session is set by the test, requests are mocks.
import { useSyncExternalStore } from 'react';

interface SessionState {
  data: { user: { id: string; email: string }; session: { id: string } } | null;
  isPending: boolean;
}

export const signedIn: SessionState = {
  data: { user: { id: 'user-1', email: 'johan@example.com' }, session: { id: 'session-1' } },
  isPending: false,
};
export const signedOut: SessionState = { data: null, isPending: false };
export const loading: SessionState = { data: null, isPending: true };

let state = signedOut;
const listeners = new Set<() => void>();

export function setSession(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const authClient = {
  useSession: () => useSyncExternalStore(subscribe, () => state),
  signIn: { email: jest.fn(), social: jest.fn() },
  signUp: { email: jest.fn() },
  signOut: jest.fn(() => {
    setSession(signedOut);
    return Promise.resolve({ data: { success: true }, error: null });
  }),
};
