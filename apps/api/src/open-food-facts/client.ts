import { OFF_FIELDS, type OffProduct } from './normalize';

export const OFF_BASE_URL = 'https://world.openfoodfacts.org';
export const OFF_TIMEOUT_MS = 4000;

/** `found`: the product; `not_found`: unknown to Open Food Facts; `unavailable`: error or timeout. */
export type OffLookup =
  { status: 'found'; product: OffProduct } | { status: 'not_found' } | { status: 'unavailable' };

export interface OpenFoodFacts {
  product: (ean: string) => Promise<OffLookup>;
}

export interface OpenFoodFactsOptions {
  /** Sent as `Cran/<version> (contact@johanpoyet.fr)`, required by Open Food Facts. */
  version: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

/** Client of the Open Food Facts product API (v2), read only. */
export function createOpenFoodFacts({
  version,
  fetch: fetchFn = fetch,
  baseUrl = OFF_BASE_URL,
  timeoutMs = OFF_TIMEOUT_MS,
}: OpenFoodFactsOptions): OpenFoodFacts {
  const userAgent = `Cran/${version} (contact@johanpoyet.fr)`;

  async function product(ean: string): Promise<OffLookup> {
    const url = `${baseUrl}/api/v2/product/${ean}.json?fields=${OFF_FIELDS.join(',')}`;
    try {
      const res = await fetchFn(url, {
        headers: { 'user-agent': userAgent, accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Open Food Facts answers 404, or 200 with status 0, for an unknown product.
      if (res.status === 404) return { status: 'not_found' };
      if (!res.ok) return { status: 'unavailable' };
      const body = (await res.json()) as { status?: unknown; product?: OffProduct };
      if (body.status !== 1 || !body.product) return { status: 'not_found' };
      return { status: 'found', product: body.product };
    } catch {
      return { status: 'unavailable' };
    }
  }

  return { product };
}
