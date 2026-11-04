import { type FoodDetail, normalizeBarcode } from '@cran/shared';

import type { FoodRepository } from '../repositories/foods';
import type { OpenFoodFacts } from './client';
import { toOffFood } from './normalize';

/** A cached product is served as is for 30 days, then refreshed on the next request (spec section 5). */
export const OFF_CACHE_DAYS = 30;
const CACHE_MS = OFF_CACHE_DAYS * 24 * 60 * 60 * 1000;

export type BarcodeLookup =
  { status: 'found'; detail: FoodDetail } | { status: 'not_found' } | { status: 'unavailable' };

/**
 * Product of a barcode: the user's own food created from this barcode first (ADR 0005), then the
 * database cache, otherwise Open Food Facts, normalised and stored. When Open Food Facts fails, an
 * outdated cached product is better than nothing and is served.
 */
export function createBarcodeLookup(
  foods: FoodRepository,
  openFoodFacts: OpenFoodFacts,
  now: () => Date = () => new Date(),
) {
  return async function lookup(userId: string, code: string): Promise<BarcodeLookup> {
    const ean = normalizeBarcode(code);
    const own = await foods.findOwnBarcodeFood(userId, ean);
    if (own) {
      const detail = await foods.find(userId, own);
      if (detail) return { status: 'found', detail };
    }
    const cached = await foods.findCachedProduct(ean);
    const fresh = cached?.offSyncedAt && now().getTime() - cached.offSyncedAt.getTime() < CACHE_MS;

    let id = fresh ? cached.id : null;
    if (id === null) {
      const answer = await openFoodFacts.product(ean);
      const product = answer.status === 'found' ? toOffFood(ean, answer.product) : null;
      if (product) id = await foods.cacheProduct(product, now());
      else if (cached) id = cached.id;
      else return { status: answer.status === 'unavailable' ? 'unavailable' : 'not_found' };
    }

    const detail = await foods.find(userId, id);
    return detail ? { status: 'found', detail } : { status: 'not_found' };
  };
}

export type BarcodeLookupFn = ReturnType<typeof createBarcodeLookup>;
