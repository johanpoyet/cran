import { type FoodDetail, normalizeBarcode } from '@cran/shared';
import { and, eq, isNull } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { toFood } from './local-food';
import { readPortions } from './portions';

/**
 * The user's own food created from this barcode (ADR 0005), from the phone: found even before the
 * synchronisation sends it, and without network.
 */
export function readOwnBarcodeFood(
  db: LocalDatabase,
  userId: string,
  ean: string,
): FoodDetail | null {
  const row = db
    .select()
    .from(schema.foods)
    .where(
      and(
        eq(schema.foods.ownerId, userId),
        eq(schema.foods.source, 'user'),
        eq(schema.foods.sourceRef, normalizeBarcode(ean)),
        isNull(schema.foods.deletedAt),
      ),
    )
    .get();
  return row ? { food: toFood(row), portions: readPortions(db, userId, row.id) } : null;
}

/**
 * A product of the catalogue already scanned (or used) on this phone, from its local copy: the scan
 * recognises it without network (S5-5). The portions are the user's own.
 */
export function readCachedProduct(
  db: LocalDatabase,
  userId: string,
  ean: string,
): FoodDetail | null {
  const row = db
    .select()
    .from(schema.foods)
    .where(
      and(
        isNull(schema.foods.ownerId),
        eq(schema.foods.source, 'off'),
        eq(schema.foods.sourceRef, normalizeBarcode(ean)),
        isNull(schema.foods.deletedAt),
      ),
    )
    .get();
  return row ? { food: toFood(row), portions: readPortions(db, userId, row.id) } : null;
}
