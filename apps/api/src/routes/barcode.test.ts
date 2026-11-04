import type { FoodDetail } from '@cran/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { foodPortions, foods } from '../db/schema';
import { fakeOpenFoodFacts, nutella, sesame, uniqueEan } from '../open-food-facts/fixtures';
import { buildTestApp } from '../test/app';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { signUpUser } from '../test/session';

let database: TestDatabase;
let off: ReturnType<typeof fakeOpenFoodFacts>;
let app: ReturnType<typeof buildTestApp>['app'];
let alice: Awaited<ReturnType<typeof signUpUser>>;
let bob: Awaited<ReturnType<typeof signUpUser>>;

beforeAll(async () => {
  database = await createTestDatabase();
  off = fakeOpenFoodFacts();
  app = buildTestApp({ db: database.db, openFoodFacts: off.client }).app;
  alice = await signUpUser(app);
  bob = await signUpUser(app);
});

afterAll(async () => {
  await database.close();
});

/** `null`: without a session. */
async function scan(ean: string, cookie: string | null = alice.cookie) {
  return app.request(`/v1/foods/barcode/${ean}`, cookie ? { headers: { cookie } } : {});
}

/** A new barcode known to the fake Open Food Facts. */
function known(product = nutella): string {
  const ean = uniqueEan();
  off.set(ean, product);
  return ean;
}

function callsFor(ean: string): number {
  return off.calls.filter((call) => call === ean).length;
}

describe('GET /v1/foods/barcode/:ean', () => {
  it('fetches an unknown barcode from Open Food Facts and stores it', async () => {
    const ean = known();

    const res = await scan(ean);

    expect(res.status).toBe(200);
    const body = (await res.json()) as FoodDetail;
    expect(body).toEqual({
      food: expect.objectContaining({
        source: 'off',
        sourceRef: ean,
        name: 'Nutella',
        brand: 'Nutella',
        kcal100g: 539,
        qualityFlag: 'ok',
      }) as object,
      portions: [],
    });
    const [row] = await database.db.select().from(foods).where(eq(foods.id, body.food.id));
    expect(row?.offSyncedAt).toBeInstanceOf(Date);
    expect(row?.ownerId).toBeNull();
  });

  it('serves a second scan of the same barcode from the cache, without Open Food Facts', async () => {
    const ean = known(sesame);

    const first = (await (await scan(ean)).json()) as FoodDetail;
    const second = await scan(ean, bob.cookie);

    expect(second.status).toBe(200);
    expect(((await second.json()) as FoodDetail).food.id).toBe(first.food.id);
    expect(callsFor(ean)).toBe(1);
  });

  it('stores a UPC-A under its EAN-13', async () => {
    // 036000291452 is a UPC-A; Open Food Facts knows it as 0036000291452.
    off.set('0036000291452', sesame);
    await database.db.delete(foods).where(eq(foods.sourceRef, '0036000291452'));

    const res = await scan('036000291452');

    expect(res.status).toBe(200);
    expect(((await res.json()) as FoodDetail).food.sourceRef).toBe('0036000291452');
    expect((await scan('0036000291452')).status).toBe(200);
    expect(callsFor('036000291452')).toBe(0);
    expect(callsFor('0036000291452')).toBe(1);
  });

  it("returns the user's own portions of the product, never another user's", async () => {
    const ean = known(sesame);
    const { food } = (await (await scan(ean)).json()) as FoodDetail;
    await database.db.insert(foodPortions).values([
      { foodId: food.id, ownerId: alice.id, label: '1 paquet', grams: 30 },
      { foodId: food.id, ownerId: bob.id, label: '1 sachet', grams: 50 },
    ]);

    const mine = (await (await scan(ean)).json()) as FoodDetail;
    const his = (await (await scan(ean, bob.cookie)).json()) as FoodDetail;

    expect(mine.portions).toEqual([{ label: '1 paquet', grams: 30 }]);
    expect(his.portions).toEqual([{ label: '1 sachet', grams: 50 }]);
  });

  it('answers 404 for a product unknown to Open Food Facts', async () => {
    const res = await scan(uniqueEan());

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'Product not found' },
    });
  });

  it('answers 404 for a product without energy, and stores nothing', async () => {
    const ean = known({ product_name_fr: 'Sans valeurs', nutriments: {} });

    expect((await scan(ean)).status).toBe(404);
    expect(await database.db.select().from(foods).where(eq(foods.sourceRef, ean))).toEqual([]);
  });

  it('answers 503 when Open Food Facts is unavailable and the product is not cached', async () => {
    const ean = known();
    off.setAvailable(false);
    try {
      const res = await scan(ean);

      expect(res.status).toBe(503);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
        'off_unavailable',
      );
    } finally {
      off.setAvailable(true);
    }
  });

  it.each([
    ['a wrong check digit', '3017620422004'],
    ['letters', 'abc'],
    ['too many digits', '30176204220031'],
  ])('answers 400 for %s', async (_, ean) => {
    expect((await scan(ean)).status).toBe(400);
  });

  it("finds the user's own food created from the barcode before Open Food Facts", async () => {
    const ean = known();
    const values = { kcal100g: 520, protein100g: 6, carbs100g: 58, fat100g: 29 };
    await database.db.insert(foods).values([
      { ...values, source: 'user', ownerId: alice.id, sourceRef: ean, name: 'Ma pâte à tartiner' },
      {
        ...values,
        source: 'user',
        ownerId: alice.id,
        sourceRef: ean,
        name: 'Ancienne',
        deletedAt: new Date(),
      },
    ]);

    const mine = (await (await scan(ean)).json()) as FoodDetail;
    expect(mine.food).toEqual(
      expect.objectContaining({ source: 'user', name: 'Ma pâte à tartiner', sourceRef: ean }),
    );
    expect(callsFor(ean)).toBe(0);

    // Another user still gets the Open Food Facts product.
    const his = (await (await scan(ean, bob.cookie)).json()) as FoodDetail;
    expect(his.food).toEqual(expect.objectContaining({ source: 'off', name: 'Nutella' }));
    expect(callsFor(ean)).toBe(1);
  });

  it('keeps one food per barcode and per user, while two users may each have theirs', async () => {
    const ean = uniqueEan();
    const values = { kcal100g: 100, protein100g: 10, carbs100g: 10, fat100g: 1 };
    await database.db.insert(foods).values([
      { ...values, source: 'user', ownerId: alice.id, sourceRef: ean, name: 'Alice' },
      { ...values, source: 'user', ownerId: bob.id, sourceRef: ean, name: 'Bob' },
    ]);

    await expect(
      database.db
        .insert(foods)
        .values({ ...values, source: 'user', ownerId: alice.id, sourceRef: ean, name: 'Doublon' }),
    ).rejects.toThrow();
  });

  it('requires a session', async () => {
    const ean = known();

    expect((await scan(ean, null)).status).toBe(401);
    expect(callsFor(ean)).toBe(0);
  });
});
