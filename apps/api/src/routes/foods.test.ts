import type { FoodSearchResult } from '@cran/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { foods } from '../db/schema';
import { searchWords } from '../repositories/foods';
import { buildTestApp } from '../test/app';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { signUpUser } from '../test/session';

let database: TestDatabase;
let app: ReturnType<typeof buildTestApp>['app'];
let alice: Awaited<ReturnType<typeof signUpUser>>;
let bob: Awaited<ReturnType<typeof signUpUser>>;

// Names of CIQUAL 2025. The CI database is shared by the test files: references unique to this run,
// and assertions only on the foods inserted here.
const run = `s${String(Date.now())}-`;
const ciqualNames = [
  'Poulet, filet sans peau cru',
  'Poulet, viande crue',
  'Foie, poulet, cru',
  'Pâté de campagne',
  'Pâtes sèches, standard, cuites, sans sel ajouté',
  "Flocons d'avoine",
  "Flocons d'avoine bouillis/cuits à l'eau",
  'Avoine, grain entier',
  'Riz blanc, cru',
  'Oeuf dur',
  'Œuf de caille, cru',
];
const inserted = new Map<string, string>();

function values(name: string, index: number) {
  return { name, kcal100g: 100 + index, protein100g: 10, carbs100g: 10, fat100g: 1 };
}

beforeAll(async () => {
  database = await createTestDatabase();
  app = buildTestApp({ db: database.db }).app;
  alice = await signUpUser(app);
  bob = await signUpUser(app);

  const rows = await database.db
    .insert(foods)
    .values([
      ...ciqualNames.map((name, index) => ({
        ...values(name, index),
        source: 'ciqual' as const,
        sourceRef: `${run}${String(index)}`,
      })),
      {
        ...values('Poulet rôti maison', 0),
        source: 'user' as const,
        ownerId: alice.id,
      },
      { ...values('Poulet de Bob', 0), source: 'user' as const, ownerId: bob.id },
      {
        ...values('Filet de poulet', 0),
        brand: 'Le Gaulois',
        source: 'off' as const,
        sourceRef: `${run}3266980000000`,
      },
      {
        ...values('Poulet supprimé', 0),
        source: 'ciqual' as const,
        sourceRef: `${run}deleted`,
        deletedAt: new Date(),
      },
      {
        ...values('Blanc de dinde', 0),
        brand: 'Fleury Michon',
        source: 'off' as const,
        sourceRef: `${run}3095757000000`,
      },
    ])
    .returning({ id: foods.id, name: foods.name });
  for (const row of rows) inserted.set(row.id, row.name);
});

afterAll(async () => {
  await database.close();
});

/** `null`: without a session. */
async function search(query: string, cookie: string | null = alice.cookie) {
  return app.request(`/v1/foods/search?${query}`, cookie ? { headers: { cookie } } : {});
}

/** Names found among the foods of this file, in the order of the answer. */
async function names(q: string, cookie: string = alice.cookie): Promise<string[]> {
  const res = await search(new URLSearchParams({ q, limit: '50' }).toString(), cookie);
  expect(res.status).toBe(200);
  const body = (await res.json()) as FoodSearchResult;
  return body.foods.flatMap((food) => {
    const name = inserted.get(food.id);
    return name ? [name] : [];
  });
}

describe('GET /v1/foods/search', () => {
  it('returns the foods with their values per 100 g', async () => {
    const res = await search('q=riz%20blanc');

    expect(res.status).toBe(200);
    const body = (await res.json()) as FoodSearchResult;
    expect(body.foods.find((food) => inserted.get(food.id) === 'Riz blanc, cru')).toMatchObject({
      source: 'ciqual',
      name: 'Riz blanc, cru',
      brand: null,
      kcal100g: 108,
      protein100g: 10,
      fiber100g: null,
      qualityFlag: 'ok',
    });
  });

  it("lists the user's foods first, then CIQUAL, then Open Food Facts", async () => {
    expect(await names('poulet')).toEqual([
      'Poulet rôti maison',
      'Poulet, viande crue',
      'Poulet, filet sans peau cru',
      'Foie, poulet, cru',
      'Filet de poulet',
    ]);
  });

  it('never returns the foods of another user', async () => {
    expect(await names('poulet', bob.cookie)).toContain('Poulet de Bob');
    expect(await names('poulet', bob.cookie)).not.toContain('Poulet rôti maison');
    expect(await names('poulet', alice.cookie)).not.toContain('Poulet de Bob');
  });

  it('leaves out deleted foods', async () => {
    expect(await names('poulet supprime')).toEqual([]);
  });

  it('ignores accents in the query and in the names', async () => {
    expect(await names('pate')).toEqual([
      'Pâté de campagne',
      'Pâtes sèches, standard, cuites, sans sel ajouté',
    ]);
    expect(await names('PÂTES')).toContain('Pâtes sèches, standard, cuites, sans sel ajouté');
    expect(await names('oeuf')).toEqual(['Oeuf dur', 'Œuf de caille, cru']);
  });

  it('needs every word, ignoring small words like "de"', async () => {
    expect(await names('flocon avoine')).toEqual([
      "Flocons d'avoine",
      "Flocons d'avoine bouillis/cuits à l'eau",
    ]);
    expect(await names('flocons de avoine')).toHaveLength(2);
    expect(await names('avoine')).toContain('Avoine, grain entier');
  });

  it('forgives a slight typo', async () => {
    expect(await names('poulat')).toContain('Poulet, viande crue');
    expect(await names('flocosn')).toContain("Flocons d'avoine");
  });

  it('searches the brand too', async () => {
    expect(await names('fleury michon')).toEqual(['Blanc de dinde']);
    expect(await names('gaulois')).toEqual(['Filet de poulet']);
  });

  it('applies the limit', async () => {
    const res = await search('q=poulet&limit=2');
    const body = (await res.json()) as FoodSearchResult;

    expect(body.foods).toHaveLength(2);
    expect(inserted.get(body.foods[0]?.id ?? '')).toBe('Poulet rôti maison');
  });

  it('answers an empty list when the query has only small words', async () => {
    const res = await search('q=de%20la');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ foods: [] });
  });

  it.each([
    ['no query', ''],
    ['an empty query', 'q=%20%20'],
    ['a limit above 50', 'q=riz&limit=51'],
    ['a limit that is not a number', 'q=riz&limit=abc'],
  ])('rejects %s', async (_, query) => {
    const res = await search(query);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'validation_error' } });
  });

  it('requires a session', async () => {
    const res = await search('q=riz', null);

    expect(res.status).toBe(401);
  });
});

describe('searchWords', () => {
  it('splits on punctuation, lowers the case and drops small words', () => {
    expect(searchWords("Flocons d'avoine, BIO")).toEqual(['flocons', 'avoine', 'bio']);
    expect(searchWords('pâtes au beurre')).toEqual(['pâtes', 'beurre']);
    expect(searchWords('riz riz')).toEqual(['riz']);
    expect(searchWords('a b c')).toEqual([]);
  });

  it('keeps at most 6 words', () => {
    expect(searchWords('un1 deux trois quatre cinq six sept')).toHaveLength(6);
  });
});
