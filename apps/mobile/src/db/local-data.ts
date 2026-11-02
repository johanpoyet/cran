import { eq } from 'drizzle-orm';

import { notifyLocalChange } from './changes';
import * as schema from './schema';
import type { LocalDatabase } from './types';

const OWNER_KEY = 'owner_user_id';

// Children before their parents (food portions reference foods).
const TABLES = [
  schema.foodPortions,
  schema.favorites,
  schema.foods,
  schema.logEntries,
  schema.waterLogs,
  schema.recipeIngredients,
  schema.recipes,
  schema.mealTemplateItems,
  schema.mealTemplates,
  schema.weighIns,
  schema.measurements,
  schema.weeklyTargets,
  schema.progressPhotos,
  schema.profiles,
  schema.localMeta,
];

/** Deletes every row of the device: on sign-out, or when another account signs in. */
export function clearLocalData(db: LocalDatabase): void {
  db.transaction((tx) => {
    for (const table of TABLES) tx.delete(table).run();
  });
  notifyLocalChange();
}

/**
 * Marks the local data as the signed-in user's. Data left by another account (signed out by a
 * revoked session, without the sign-out button) is deleted first; the same user signing in again
 * finds their data.
 */
export function claimLocalData(db: LocalDatabase, userId: string): void {
  const owner = db
    .select({ value: schema.localMeta.value })
    .from(schema.localMeta)
    .where(eq(schema.localMeta.key, OWNER_KEY))
    .get();
  if (owner?.value === userId) return;
  if (owner) clearLocalData(db);
  db.insert(schema.localMeta).values({ key: OWNER_KEY, value: userId }).run();
}
