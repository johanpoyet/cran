import { useMemo, useSyncExternalStore } from 'react';

// The screens read SQLite synchronously; every write tells them to read again.

let version = 0;
const listeners = new Set<() => void>();

/** Call after a write to the local database: the screens using `useLocalQuery` read again. */
export function notifyLocalChange(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentVersion(): number {
  return version;
}

/**
 * Result of a synchronous read of the local database, read again after each local change.
 * `read` must be stable (useCallback) or the query runs at every render.
 */
export function useLocalQuery<T>(read: () => T): T {
  const changes = useSyncExternalStore(subscribe, currentVersion);
  return useMemo(() => readAfter(changes, read), [read, changes]);
}

/** `read`, as of the given change: makes the change a real input of the memo. */
function readAfter<T>(_change: number, read: () => T): T {
  return read();
}
