import { and, asc, eq, isNull, or } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

export interface Portion {
  label: string;
  grams: number;
}

/** Named portions of a food on the phone: the catalogue's and the user's own. */
export function readPortions(db: LocalDatabase, userId: string, foodId: string): Portion[] {
  return db
    .select({ label: schema.foodPortions.label, grams: schema.foodPortions.grams })
    .from(schema.foodPortions)
    .where(
      and(
        eq(schema.foodPortions.foodId, foodId),
        isNull(schema.foodPortions.deletedAt),
        or(isNull(schema.foodPortions.ownerId), eq(schema.foodPortions.ownerId, userId)),
      ),
    )
    .orderBy(asc(schema.foodPortions.grams))
    .all();
}
