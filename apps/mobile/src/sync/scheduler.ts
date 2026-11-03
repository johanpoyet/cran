import type { LocalDatabase } from '../db/types';
import { ApiError } from '../lib/api';
import { Sentry } from '../lib/sentry';
import { syncNow } from './engine';
import { pendingCount } from './queue';
import { useSyncState } from './store';

let database: LocalDatabase | null = null;
let running: Promise<void> | null = null;
let again = false;

/** Whether a synchronisation was requested while one was running; resets the request. */
function takeAgain(): boolean {
  const requested = again;
  again = false;
  return requested;
}

/** Database the synchronisation runs on; null when signed out (nothing is synchronised). */
export function setSyncDatabase(db: LocalDatabase | null): void {
  database = db;
}

async function run(db: LocalDatabase): Promise<void> {
  useSyncState.setState({ status: 'syncing' });
  try {
    await syncNow(db);
    useSyncState.setState({ status: 'idle', lastSyncedAt: new Date() });
  } catch (error) {
    // Unreachable server: normal offline; anything else is reported.
    const offline = !(error instanceof ApiError);
    if (!offline) Sentry.captureException(error);
    useSyncState.setState({ status: offline ? 'offline' : 'error' });
  } finally {
    useSyncState.setState({ pending: pendingCount(db) });
  }
}

/**
 * Starts a synchronisation, or queues one more if one is running (a change made meanwhile must
 * not wait for the next trigger). Resolves when the queue of requests is done.
 */
export function requestSync(): Promise<void> {
  const db = database;
  if (!db) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  again = false;
  running = (async () => {
    do {
      await run(db);
    } while (takeAgain());
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Refreshes the count of changes waiting, after a local write. */
export function refreshPendingCount(): number {
  const pending = database ? pendingCount(database) : 0;
  useSyncState.setState({ pending });
  return pending;
}
