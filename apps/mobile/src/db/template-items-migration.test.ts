import { eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createRawDatabase } from '../test/local-database';
import migrations from './migrations';
import * as schema from './schema';

const alice = '0192f0c0-0000-7000-8000-00000000a11c';

/** The migrations up to (not including) the rebuild of the template items (S6-3). */
const beforeRebuild = {
  journal: {
    ...migrations.journal,
    entries: migrations.journal.entries.slice(
      0,
      migrations.journal.entries.findIndex(({ tag }) => tag.includes('template_item_servings')),
    ),
  },
  migrations: migrations.migrations,
};

describe('template items migration', () => {
  it('keeps the items and the sync triggers when the table is rebuilt', async () => {
    const db = await createRawDatabase();
    const expo = db as ExpoSQLiteDatabase<typeof schema>;
    await migrate(expo, beforeRebuild);
    db.run(
      sql`insert into meal_template_items (id, user_id, created_at, updated_at, template_id, food_id, grams, position)
        values ('item', ${alice}, 0, 0, 'template', 'food', 250, 0)`,
    );
    db.run(sql`delete from pending_changes`);

    await migrate(expo, migrations);

    expect(db.select().from(schema.mealTemplateItems).all()).toEqual([
      expect.objectContaining({ id: 'item', grams: 250, servings: null, position: 0 }),
    ]);
    db.update(schema.mealTemplateItems)
      .set({ servings: 2, grams: null })
      .where(eq(schema.mealTemplateItems.id, 'item'))
      .run();
    db.insert(schema.mealTemplateItems)
      .values({
        id: 'new',
        userId: alice,
        templateId: 'template',
        recipeId: 'r',
        servings: 1,
        position: 1,
      })
      .run();
    expect(
      db.select({ id: schema.pendingChanges.rowId }).from(schema.pendingChanges).all(),
    ).toEqual([{ id: 'item' }, { id: 'new' }]);
  });
});
