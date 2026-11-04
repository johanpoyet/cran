import { type FoodDetail, foodDetailSchema, isValidBarcode } from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, apiFetch } from '../lib/api';

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

/** Product of a barcode, from the API (its Open Food Facts cache, otherwise Open Food Facts). */
export async function lookupBarcode(ean: string): Promise<Lookup> {
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
 * meanwhile, or that are not an EAN-8, UPC-A or EAN-13, are ignored.
 */
export function useBarcodeScan() {
  const [scan, setScan] = useState<BarcodeScan>({ status: 'scanning' });
  // The camera reports the same code several times a second: only the first one counts.
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const look = useCallback((ean: string) => {
    setScan({ status: 'loading', ean });
    void lookupBarcode(ean).then((result) => {
      if (mounted.current) setScan(result);
    });
  }, []);

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

  return { scan, onScanned, retry, rescan };
}
