import type { Food } from '@cran/shared';
import { and, eq, isNull, or } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { searchable, toFood } from './local-food';

/**
 * Foods of the phone whose name or brand contains every word of the query, accents ignored: the
 * user's own foods first, then the global foods already used (cached). Works offline.
 */
export function searchLocalFoods(
  db: LocalDatabase,
  userId: string,
  query: string,
  limit: number,
): Food[] {
  const words = searchable(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
  if (words.length === 0) return [];

  const rows = db
    .select()
    .from(schema.foods)
    .where(
      and(
        isNull(schema.foods.deletedAt),
        or(isNull(schema.foods.ownerId), eq(schema.foods.ownerId, userId)),
      ),
    )
    .all();
  return rows
    .filter((row) => {
      const text = searchable(`${row.name} ${row.brand ?? ''}`);
      return words.every((word) => text.includes(word));
    })
    .sort(
      (a, b) =>
        Number(b.source === 'user') - Number(a.source === 'user') ||
        a.name.length - b.name.length ||
        a.name.localeCompare(b.name, 'fr'),
    )
    .slice(0, limit)
    .map(toFood);
}
