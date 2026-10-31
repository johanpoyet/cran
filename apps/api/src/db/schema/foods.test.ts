import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../test/app';
import { createTestDatabase, type TestDatabase } from '../../test/database';
import { signUpUser } from '../../test/session';
import { user } from './auth';
import { favorites, foodPortions, foods, unaccented } from './index';

let database: TestDatabase;
let app: ReturnType<typeof buildTestApp>['app'];

beforeAll(async () => {
  database = await createTestDatabase();
  app = buildTestApp({ db: database.db }).app;
});

afterAll(async () => {
  await database.close();
});

let ref = 0;
/** A CIQUAL food with a reference unique to this run (the CI database is shared by test files). */
function ciqualFood(overrides: Partial<typeof foods.$inferInsert> = {}) {
  ref += 1;
  return {
    source: 'ciqual' as const,
    sourceRef: `test-${String(Date.now())}-${String(ref)}`,
    name: 'Riz basmati, cuit',
    kcal100g: 130,
    protein100g: 2.7,
    carbs100g: 28,
    fat100g: 0.4,
    ...overrides,
  };
}

/** Message of the database error behind a failed query. */
async function violation(query: PromiseLike<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause;
    return cause instanceof Error ? cause.message : String(error);
  }
  throw new Error('the query succeeded');
}

describe('foods', () => {
  it('stores a global food with its values per 100 g', async () => {
    const [food] = await database.db.insert(foods).values(ciqualFood()).returning();

    expect(food).toMatchObject({
      ownerId: null,
      kcal100g: 130,
      protein100g: 2.7,
      fiber100g: null,
      qualityFlag: 'ok',
      deletedAt: null,
    });
    expect(food?.serverSeq).toBeGreaterThan(0);
  });

  it('refuses the same reference twice for one source, but not across sources', async () => {
    const food = ciqualFood();
    await database.db.insert(foods).values(food);

    expect(await violation(database.db.insert(foods).values(food))).toContain(
      'foods_source_ref_idx',
    );
    await expect(
      database.db.insert(foods).values({ ...food, source: 'off' }),
    ).resolves.toBeDefined();
  });

  it('requires an owner for user foods and none for global foods', async () => {
    const owner = await signUpUser(app);
    const userFood = { ...ciqualFood(), source: 'user' as const, sourceRef: null };

    expect(await violation(database.db.insert(foods).values(userFood))).toContain(
      'foods_owner_check',
    );
    expect(
      await violation(database.db.insert(foods).values(ciqualFood({ ownerId: owner.id }))),
    ).toContain('foods_owner_check');
    await expect(
      database.db.insert(foods).values({ ...userFood, ownerId: owner.id }),
    ).resolves.toBeDefined();
  });

  it('requires a reference for global foods', async () => {
    expect(
      await violation(database.db.insert(foods).values(ciqualFood({ sourceRef: null }))),
    ).toContain('foods_source_ref_check');
  });

  it.each([
    ['negative calories', { kcal100g: -1 }],
    ['negative fibre', { fiber100g: -0.5 }],
    ['an empty default portion', { defaultPortionG: 0 }],
  ])('refuses %s', async (_, values) => {
    expect(await violation(database.db.insert(foods).values(ciqualFood(values)))).toMatch(
      /foods_(nutrients|default_portion)_check/,
    );
  });

  it('keeps numeric values with two decimals', async () => {
    const [food] = await database.db
      .insert(foods)
      .values(ciqualFood({ salt100g: 1.234, defaultPortionG: 9999.99 }))
      .returning();

    expect(food?.salt100g).toBe(1.23);
    expect(food?.defaultPortionG).toBe(9999.99);
  });
});

describe('search columns', () => {
  it('strips accents with f_unaccent', async () => {
    const [food] = await database.db
      .insert(foods)
      .values(ciqualFood({ name: 'Pâtes à la crème, œuf brûlé' }))
      .returning({ plain: sql<string>`${unaccented(foods.name)}` });

    expect(food?.plain).toBe('Pates a la creme, oeuf brule');
  });

  it('finds a name without accents and with a typo through the trigram index', async () => {
    const [pates] = await database.db
      .insert(foods)
      .values(ciqualFood({ name: 'Pâtes alimentaires, cuites', brand: 'Panzani' }))
      .returning();

    const matches = await database.db
      .select({ id: foods.id })
      .from(foods)
      .where(sql`${unaccented(foods.name)} % f_unaccent('pates alimentaire')`);
    expect(matches.map(({ id }) => id)).toContain(pates?.id);

    const byBrand = await database.db
      .select({ id: foods.id })
      .from(foods)
      .where(sql`${unaccented(foods.brand)} % f_unaccent('panzanni')`);
    expect(byBrand.map(({ id }) => id)).toContain(pates?.id);
  });
});

describe('food portions', () => {
  it('belong to a food and weigh more than 0 g', async () => {
    const [food] = await database.db.insert(foods).values(ciqualFood()).returning();
    const foodId = food?.id ?? '';

    const [portion] = await database.db
      .insert(foodPortions)
      .values({ foodId, label: '1 bol', grams: 150 })
      .returning();
    expect(portion).toMatchObject({ ownerId: null, grams: 150 });

    expect(
      await violation(database.db.insert(foodPortions).values({ foodId, label: '0', grams: 0 })),
    ).toContain('food_portions_grams_check');
  });
});

describe('favorites', () => {
  it('point to exactly one food or recipe', async () => {
    const owner = await signUpUser(app);
    const [food] = await database.db.insert(foods).values(ciqualFood()).returning();
    const foodId = food?.id ?? '';

    await expect(
      database.db.insert(favorites).values({ userId: owner.id, foodId }),
    ).resolves.toBeDefined();
    expect(await violation(database.db.insert(favorites).values({ userId: owner.id }))).toContain(
      'favorites_target_check',
    );
    expect(
      await violation(
        database.db
          .insert(favorites)
          .values({ userId: owner.id, foodId, recipeId: '0192f0c0-0000-7000-8000-000000000000' }),
      ),
    ).toContain('favorites_target_check');
  });
});

describe('account deletion', () => {
  it('removes the foods, portions and favourites of the user, not the global catalogue', async () => {
    const owner = await signUpUser(app);
    const [globalFood] = await database.db.insert(foods).values(ciqualFood()).returning();
    const [mine] = await database.db
      .insert(foods)
      .values({ ...ciqualFood(), source: 'user', sourceRef: null, ownerId: owner.id })
      .returning();
    const globalId = globalFood?.id ?? '';
    const mineId = mine?.id ?? '';
    await database.db.insert(foodPortions).values([
      { foodId: globalId, ownerId: owner.id, label: '1 bol', grams: 150 },
      { foodId: mineId, ownerId: owner.id, label: '1 galette', grams: 50 },
    ]);
    await database.db.insert(favorites).values({ userId: owner.id, foodId: globalId });

    await database.db.delete(user).where(eq(user.id, owner.id));

    expect(await database.db.select().from(foods).where(eq(foods.id, mineId))).toEqual([]);
    expect(await database.db.select().from(foods).where(eq(foods.id, globalId))).toHaveLength(1);
    expect(
      await database.db.select().from(foodPortions).where(eq(foodPortions.ownerId, owner.id)),
    ).toEqual([]);
    expect(
      await database.db.select().from(favorites).where(eq(favorites.userId, owner.id)),
    ).toEqual([]);
  });
});
