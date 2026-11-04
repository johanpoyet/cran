import { type FoodDetail, foodDetailSchema, isValidBarcode } from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LocalDatabase } from '../db/types';
import { ApiError, apiFetch } from '../lib/api';
import { readOwnBarcodeFood } from './own-barcode';

/**
 * State of the scan screen: the camera looks for a code, then the product of the code read is
 * fetched. `offline`: the server is unreachable; `unavailable`: Open Food Facts failed.
 */
export type BarcodeScan =
  | { status: 'scanning' }
  | { status: 'loading'; ean: string }
  | { status: 'found'; ean: string; detail: FoodDetail }
  | { status: 'not_found' | 'offline' | 'unavailable'; ean: string };

type Lookup = Exclude<BarcodeScan, { status: 'scanning' } | { status: 'loading' }>;

/**
 * Product of a barcode: the user's own food on the phone first, otherwise the API (the user's food
 * on the server, its Open Food Facts cache, otherwise Open Food Facts).
 */
export async function lookupBarcode(
  db: LocalDatabase,
  userId: string,
  ean: string,
): Promise<Lookup> {
  const own = readOwnBarcodeFood(db, userId, ean);
  if (own) return { status: 'found', ean, detail: own };
  try {
    const detail = await apiFetch(`/v1/foods/barcode/${ean}`, foodDetailSchema);
    return { status: 'found', ean, detail };
  } catch (error) {
    if (!(error instanceof ApiError)) return { status: 'offline', ean };
    return { status: error.status === 404 ? 'not_found' : 'unavailable', ean };
  }
}

/**
 * Scan flow: the first valid code read stops the scanning, vibrates and is looked up; codes read
 * meanwhile, or that are not an EAN-8, UPC-A or EAN-13, are ignored. `refresh` looks the code up
 * again, once the user has created a food for it. `initialEan`: a code read before the screen was
 * mounted again (kept in the route), looked up at once.
 */
export function useBarcodeScan(db: LocalDatabase, userId: string, initialEan?: string) {
  const restored = initialEan && isValidBarcode(initialEan) ? initialEan : null;
  const [scan, setScan] = useState<BarcodeScan>(
    restored ? { status: 'loading', ean: restored } : { status: 'scanning' },
  );
  // The camera reports the same code several times a second: only the first one counts.
  const busy = useRef(restored !== null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Only on mount: later changes of the route come from this hook.
  const [firstEan] = useState(restored);
  useEffect(() => {
    if (firstEan === null) return;
    void lookupBarcode(db, userId, firstEan).then((result) => {
      if (mounted.current) setScan(result);
    });
  }, [db, userId, firstEan]);

  const look = useCallback(
    (ean: string) => {
      setScan({ status: 'loading', ean });
      void lookupBarcode(db, userId, ean).then((result) => {
        if (mounted.current) setScan(result);
      });
    },
    [db, userId],
  );

  const onScanned = useCallback(
    (code: string) => {
      if (busy.current || !isValidBarcode(code)) return;
      busy.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      look(code);
    },
    [look],
  );

  const retry = useCallback(() => {
    if (scan.status !== 'scanning') look(scan.ean);
  }, [look, scan]);

  const rescan = useCallback(() => {
    busy.current = false;
    setScan({ status: 'scanning' });
  }, []);

  // Same as retry, but without the loading state: the sheet changes in place.
  const refresh = useCallback(() => {
    if (scan.status === 'scanning' || scan.status === 'loading') return;
    const { ean } = scan;
    void lookupBarcode(db, userId, ean).then((result) => {
      if (mounted.current) setScan(result);
    });
  }, [db, userId, scan]);

  return { scan, onScanned, retry, rescan, refresh };
}
