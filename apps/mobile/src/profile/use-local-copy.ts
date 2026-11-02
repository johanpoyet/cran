import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { LocalDatabase } from '../db/types';
import { refreshLocalCopy } from './local-copy';

/** Refreshes the local copy of the profile and target at launch and back to the foreground. */
export function useLocalCopy(db: LocalDatabase, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void refreshLocalCopy(db);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshLocalCopy(db);
    });
    return () => {
      subscription.remove();
    };
  }, [db, enabled]);
}
