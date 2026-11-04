import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../db/migrations';
import * as schema from '../db/schema';
import { createRawDatabase } from '../test/local-database';

const alice = '0192f0c0-0000-7000-8000-00000000a11c';

/** The migrations up to (not including) the sync triggers. */
const beforeSync = {
  journal: {
    ...migrations.journal,
    entries: migrations.journal.entries.slice(
      0,
      migrations.journal.entries.findIndex(({ tag }) => tag.includes('sync_triggers')),
    ),
  },
  migrations: migrations.migrations,
};

describe('sync migration', () => {
  it("queues the user's rows written before the sync existed, not the cached global foods", async () => {
    const db = await createRawDatabase();
    const expo = db as ExpoSQLiteDatabase<typeof schema>;
    await migrate(expo, beforeSync);
    db.insert(schema.waterLogs)
      .values({ id: 'w1', userId: alice, date: '2026-11-02', ml: 250 })
      .run();
    db.insert(schema.foods)
      .values([
        {
          id: 'mine',
          ownerId: alice,
          source: 'user',
          name: 'Galette',
          kcal100g: 162,
          protein100g: 6,
          carbs100g: 30,
          fat100g: 2,
        },
        {
          id: 'ciqual',
          ownerId: null,
          source: 'ciqual',
          sourceRef: '9104',
          name: 'Riz',
          kcal100g: 130,
          protein100g: 2.7,
          carbs100g: 28,
          fat100g: 0.4,
        },
      ])
      .run();

    await migrate(expo, migrations);

    expect(
      db
        .select({ table: schema.pendingChanges.tableName, id: schema.pendingChanges.rowId })
        .from(schema.pendingChanges)
        .all(),
    ).toEqual(
      expect.arrayContaining([
        { table: 'water_logs', id: 'w1' },
        { table: 'foods', id: 'mine' },
      ]),
    );
    expect(db.select().from(schema.pendingChanges).all()).toHaveLength(2);
  });
});
