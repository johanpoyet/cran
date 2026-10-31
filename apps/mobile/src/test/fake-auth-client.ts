// Stand-in for src/auth/client in tests: the session is set by the test, requests are mocks.
import { useSyncExternalStore } from 'react';

interface SessionState {
  data: {
    user: { id: string; email: string; onboardedAt: Date | null };
    session: { id: string };
  } | null;
  isPending: boolean;
}

const user = { id: 'user-1', email: 'johan@example.com' };

/** Signed in and onboarded: the app opens on its tabs. */
export const signedIn: SessionState = {
  data: { user: { ...user, onboardedAt: new Date('2026-10-31T10:00:00Z') }, session: { id: 's1' } },
  isPending: false,
};
/** Signed in, onboarding not done yet. */
export const onboarding: SessionState = {
  data: { user: { ...user, onboardedAt: null }, session: { id: 's1' } },
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

export const apiUrl = 'https://api.test';

export const authClient = {
  useSession: () => useSyncExternalStore(subscribe, () => state),
  getCookie: jest.fn(() => Promise.resolve('better-auth.session_token=token')),
  signIn: { email: jest.fn(), social: jest.fn() },
  signUp: { email: jest.fn() },
  signOut: jest.fn(() => {
    setSession(signedOut);
    return Promise.resolve({ data: { success: true }, error: null });
  }),
};

/** The real one asks the API again; tests decide what the new session is. */
export const refreshSession = jest.fn();
