import { and, eq, inArray, TransactionRollbackError } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { AppDatabase } from '../db/client';
import { foods } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { alimLines, compoLines, type FixtureFood, rice } from './fixtures';
import { importCiqual, MIN_CIQUAL_FOODS } from './import';

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

// The CI database is shared between test files: codes unique to this run.
let run = 0;
let prefix = '';
beforeEach(() => {
  run += 1;
  prefix = `t${String(Date.now())}${String(run)}-`;
});

/** A table of `MIN_CIQUAL_FOODS` foods: rice, a food without energy and fillers. */
function table(changes: { rice?: Partial<FixtureFood>; fillers?: number } = {}): FixtureFood[] {
  const fillers = Array.from({ length: changes.fillers ?? MIN_CIQUAL_FOODS }, (_, index) => ({
    code: `${prefix}${String(index)}`,
    name: `Aliment ${String(index)}`,
    contents: { '328': '100', '25000': '1', '31000': '20', '40000': '1' },
  }));
  return [
    { ...rice, code: `${prefix}rice`, ...changes.rice },
    { code: `${prefix}vanilla`, name: 'Vanille, gousse', contents: { '328': '-', '25000': '-' } },
    ...fillers,
  ];
}

function files(foodsOfTable: FixtureFood[]) {
  return { foods: alimLines(foodsOfTable), contents: compoLines(foodsOfTable) };
}

/**
 * A test run inside a transaction rolled back at the end. The import soft-deletes every CIQUAL
 * food missing from its files: in the CI database, shared by the test files running in parallel,
 * it would delete the CIQUAL foods the search tests have just inserted.
 */
function isolatedIt(name: string, test: (db: AppDatabase) => Promise<void>) {
  it(name, async () => {
    await database.db
      .transaction(async (tx) => {
        await test(tx);
        tx.rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof TransactionRollbackError)) throw error;
      });
  });
}

async function ciqualRows(db: AppDatabase) {
  return db
    .select()
    .from(foods)
    .where(and(eq(foods.source, 'ciqual')))
    .then((rows) => rows.filter((row) => row.sourceRef?.startsWith(prefix)));
}

describe('importCiqual', () => {
  isolatedIt('imports the foods with energy and reports the others', async (db) => {
    const result = await importCiqual(db, files(table()));

    expect(result).toEqual({
      imported: MIN_CIQUAL_FOODS + 1,
      written: MIN_CIQUAL_FOODS + 1,
      skipped: [`${prefix}vanilla`],
      removed: expect.any(Number) as number,
    });
    const [riceRow] = await db
      .select()
      .from(foods)
      .where(eq(foods.sourceRef, `${prefix}rice`));
    expect(riceRow).toMatchObject({
      source: 'ciqual',
      ownerId: null,
      name: 'Riz blanc, cuit, sans sel ajouté',
      kcal100g: 131,
      salt100g: 0,
      qualityFlag: 'ok',
      deletedAt: null,
    });
  });

  isolatedIt('creates no duplicate and writes nothing when run again', async (db) => {
    await importCiqual(db, files(table()));
    const before = await ciqualRows(db);

    const result = await importCiqual(db, files(table()));

    expect(result.written).toBe(0);
    const after = await ciqualRows(db);
    expect(after).toHaveLength(MIN_CIQUAL_FOODS + 1);
    expect(after.map((row) => [row.id, row.serverSeq]).sort()).toEqual(
      before.map((row) => [row.id, row.serverSeq]).sort(),
    );
  });

  isolatedIt(
    'updates a changed food in place and soft-deletes the foods gone from the table',
    async (db) => {
      await importCiqual(db, files(table()));
      const [riceBefore] = await db
        .select()
        .from(foods)
        .where(eq(foods.sourceRef, `${prefix}rice`));

      const newVersion = table({
        rice: { name: 'Riz blanc, cuit', contents: { ...rice.contents, '328': '130' } },
      }).filter((food) => food.code !== `${prefix}0`);
      newVersion.push({ ...rice, code: `${prefix}new` });
      const result = await importCiqual(db, files(newVersion));

      expect(result.written).toBe(2);
      expect(result.removed).toBeGreaterThanOrEqual(1);
      const changed = await db
        .select()
        .from(foods)
        .where(inArray(foods.sourceRef, [`${prefix}rice`, `${prefix}0`]));
      const riceAfter = changed.find((row) => row.sourceRef === `${prefix}rice`);
      expect(riceAfter).toMatchObject({
        id: riceBefore?.id,
        name: 'Riz blanc, cuit',
        kcal100g: 130,
      });
      expect(riceAfter?.serverSeq).toBeGreaterThan(riceBefore?.serverSeq ?? 0);
      expect(changed.find((row) => row.sourceRef === `${prefix}0`)?.deletedAt).toBeInstanceOf(Date);

      // Back in a later version: restored.
      const restored = await importCiqual(db, files(table()));
      expect(restored.written).toBeGreaterThanOrEqual(2);
      const [back] = await db
        .select()
        .from(foods)
        .where(eq(foods.sourceRef, `${prefix}0`));
      expect(back?.deletedAt).toBeNull();
    },
  );

  isolatedIt('refuses truncated files without touching the catalogue', async (db) => {
    await importCiqual(db, files(table()));

    await expect(importCiqual(db, files(table({ fillers: 10 })))).rejects.toThrow(
      /incomplete files/,
    );
    expect((await ciqualRows(db)).filter((row) => row.deletedAt === null)).toHaveLength(
      MIN_CIQUAL_FOODS + 1,
    );
  });

  isolatedIt('leaves user and Open Food Facts foods alone', async (db) => {
    const [off] = await db
      .insert(foods)
      .values({
        source: 'off',
        sourceRef: `${prefix}3017620422003`,
        name: 'Pâte à tartiner',
        kcal100g: 539,
        protein100g: 6.3,
        carbs100g: 57.5,
        fat100g: 30.9,
      })
      .returning();

    await importCiqual(db, files(table()));

    const [after] = await db
      .select()
      .from(foods)
      .where(eq(foods.id, off?.id ?? ''));
    expect(after?.deletedAt).toBeNull();
  });
});
