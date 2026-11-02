import { useEffect, useState } from 'react';

import { Sentry } from '../lib/sentry';
import { claimLocalData } from './local-data';
import { migrateLocalDatabase } from './migrate';
import type { LocalDatabase } from './types';

export type LocalDatabaseStatus = 'loading' | 'ready' | 'error';

/**
 * Migrates the local database once, then gives it to the signed-in user (`userId`, null when
 * signed out). The screens wait for "ready" before reading it.
 */
export function useLocalDatabase(db: LocalDatabase, userId: string | null): LocalDatabaseStatus {
  const [migration, setMigration] = useState<LocalDatabaseStatus>('loading');
  const [claimedFor, setClaimedFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    migrateLocalDatabase(db).then(
      () => {
        if (active) setMigration('ready');
      },
      (error: unknown) => {
        Sentry.captureException(error);
        if (active) setMigration('error');
      },
    );
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (migration !== 'ready' || userId === null) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        claimLocalData(db, userId);
        if (active) setClaimedFor(userId);
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        if (active) setMigration('error');
      });
    return () => {
      active = false;
    };
  }, [db, migration, userId]);

  if (migration !== 'ready') return migration;
  return userId === null || claimedFor === userId ? 'ready' : 'loading';
}
