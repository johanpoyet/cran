import { syncPullResultSchema, syncPushResultSchema } from '@cran/shared';

import { notifyLocalChange } from '../db/changes';
import type { LocalDatabase } from '../db/types';
import { apiFetch } from '../lib/api';
import { applyPull, readCursor } from './apply-pull';
import { cacheMissingFoods } from './food-cache';
import { readBatch, settle } from './queue';

export interface SyncReport {
  pushed: number;
  pulled: number;
  /** Global foods copied to the phone. */
  cached: number;
}

/**
 * One synchronisation (spec section 5): push the queued changes by batches of 500, then pull the
 * server's changes since the cursor, page by page, then copy the global foods the pulled rows use.
 * Rejects when the server cannot be reached; what
 * was done before stays done (each batch and page is saved on its own).
 */
export async function syncNow(db: LocalDatabase): Promise<SyncReport> {
  let pushed = 0;
  for (;;) {
    const batch = readBatch(db);
    if (batch.length === 0) break;
    const result = await apiFetch('/v1/sync/push', syncPushResultSchema, {
      method: 'POST',
      body: { changes: batch.map(({ table, row }) => ({ table, row })) },
    });
    const settled = settle(db, batch, result);
    pushed += result.accepted.length;
    // Changes kept for a retry stay for the next synchronisation.
    if (settled < batch.length || batch.length < 500) break;
  }

  let pulled = 0;
  let cursor = readCursor(db);
  for (;;) {
    const page = await apiFetch(`/v1/sync/pull?cursor=${String(cursor)}`, syncPullResultSchema);
    applyPull(db, page);
    pulled += page.changes.length;
    cursor = page.cursor;
    if (!page.hasMore) break;
  }

  const cached = await cacheMissingFoods(db);

  if (pushed > 0 || pulled > 0 || cached > 0) notifyLocalChange();
  return { pushed, pulled, cached };
}
