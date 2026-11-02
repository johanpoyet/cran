import { type Me, meSchema } from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { apiFetch } from '../lib/api';

/**
 * Copies the profile and the latest weekly target of the server to the local database, which the
 * screens read. Until the sync (S4), this copy at launch is how they reach the phone.
 */
export function saveMe(db: LocalDatabase, me: Me): void {
  const { profile, weeklyTarget } = me;
  db.transaction((tx) => {
    if (profile) {
      const { id, updatedAt, healthDataConsentAt, ...fields } = profile;
      const values = {
        ...fields,
        userId: me.user.id,
        updatedAt: new Date(updatedAt),
        healthDataConsentAt: healthDataConsentAt === null ? null : new Date(healthDataConsentAt),
      };
      tx.insert(schema.profiles)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: schema.profiles.id, set: values })
        .run();
    }
    if (weeklyTarget) {
      const { id, ...fields } = weeklyTarget;
      const values = { ...fields, userId: me.user.id };
      tx.insert(schema.weeklyTargets)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: schema.weeklyTargets.id, set: values })
        .run();
    }
  });
  notifyLocalChange();
}

/** Fetches /v1/me and saves it locally. Offline or failing: the previous copy stays. */
export async function refreshLocalCopy(db: LocalDatabase): Promise<boolean> {
  try {
    saveMe(db, await apiFetch('/v1/me', meSchema));
    return true;
  } catch {
    return false;
  }
}
