import { describe, expect, it, vi } from 'vitest';

import { createOpenFoodFacts } from './client';
import { nutella } from './fixtures';

const ean = '3017620422003';

function respond(status: number, body: unknown) {
  return vi.fn<typeof globalThis.fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
}

describe('createOpenFoodFacts', () => {
  it('asks for the useful fields only, with the Cran User-Agent', async () => {
    const fetchFn = respond(200, { status: 1, product: nutella });
    const off = createOpenFoodFacts({ version: '1.2.3', fetch: fetchFn });

    expect(await off.product(ean)).toEqual({ status: 'found', product: nutella });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name_fr,product_name,brands,serving_quantity,nutriments`,
    );
    expect(new Headers(init?.headers).get('user-agent')).toBe('Cran/1.2.3 (contact@johanpoyet.fr)');
  });

  it.each([
    ['a 404', 404, { status: 0, status_verbose: 'product not found' }],
    ['status 0', 200, { status: 0, status_verbose: 'no code or invalid code' }],
  ])('reports an unknown product on %s', async (_, status, body) => {
    const off = createOpenFoodFacts({ version: 'test', fetch: respond(status, body) });
    expect(await off.product(ean)).toEqual({ status: 'not_found' });
  });

  it('reports a server error as unavailable', async () => {
    const off = createOpenFoodFacts({ version: 'test', fetch: respond(503, {}) });
    expect(await off.product(ean)).toEqual({ status: 'unavailable' });
  });

  it('reports a network error as unavailable', async () => {
    const fetchFn = vi.fn<typeof globalThis.fetch>(() =>
      Promise.reject(new TypeError('fetch failed')),
    );
    const off = createOpenFoodFacts({ version: 'test', fetch: fetchFn });
    expect(await off.product(ean)).toEqual({ status: 'unavailable' });
  });

  it('gives up after the timeout', async () => {
    // Never answers: only the abort signal ends the request.
    const fetchFn = vi.fn<typeof globalThis.fetch>(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason as Error);
          });
        }),
    );
    const off = createOpenFoodFacts({ version: 'test', fetch: fetchFn, timeoutMs: 20 });
    expect(await off.product(ean)).toEqual({ status: 'unavailable' });
  });
});
