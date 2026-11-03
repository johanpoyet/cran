import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onLocalChange } from '../db/changes';
import type { LocalDatabase } from '../db/types';
import { refreshPendingCount, requestSync, setSyncDatabase } from './scheduler';

/** Every 5 minutes while the app is in the foreground (spec section 3). */
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
/** After a change of the phone, so that another device sees it soon. */
export const SYNC_AFTER_CHANGE_MS = 3000;

/**
 * Runs the synchronisation while signed in: at launch, back to the foreground, when the network
 * comes back, every 5 minutes, and a few seconds after a local change.
 */
export function useSync(db: LocalDatabase, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    setSyncDatabase(db);
    void requestSync();

    let interval: ReturnType<typeof setInterval> | null = setInterval(
      () => void requestSync(),
      SYNC_INTERVAL_MS,
    );
    let afterChange: ReturnType<typeof setTimeout> | null = null;

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void requestSync();
        interval ??= setInterval(() => void requestSync(), SYNC_INTERVAL_MS);
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });
    let reachable: boolean | undefined;
    const network = addNetworkStateListener(({ isInternetReachable }) => {
      if (isInternetReachable && reachable === false) void requestSync();
      reachable = isInternetReachable;
    });
    const changes = onLocalChange(() => {
      // Pulled rows notify too, but leave nothing to push: only real local changes schedule a sync.
      if (refreshPendingCount() === 0) return;
      if (afterChange) clearTimeout(afterChange);
      afterChange = setTimeout(() => void requestSync(), SYNC_AFTER_CHANGE_MS);
    });

    return () => {
      setSyncDatabase(null);
      if (interval) clearInterval(interval);
      if (afterChange) clearTimeout(afterChange);
      appState.remove();
      network.remove();
      changes();
    };
  }, [db, enabled]);
}
