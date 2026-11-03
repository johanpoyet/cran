import { eq, sql } from 'drizzle-orm';

import { createLocalDatabase, createRawDatabase } from '../test/local-database';
import { claimLocalData, clearLocalData } from './local-data';
import { migrateLocalDatabase } from './migrate';
import migrations from './migrations';
import * as schema from './schema';
import type { LocalDatabase } from './types';

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';

function tableNames(db: LocalDatabase): string[] {
  return db
    .all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`,
    )
    .map(({ name }) => name);
}

/** One row in every table, for the user. */
function fillEverything(db: LocalDatabase, userId: string): void {
  const common = (id: string) => ({ id: `${id}-${userId}`, userId });
  const date = '2026-11-02';
  db.insert(schema.profiles)
    .values({
      ...common('profile'),
      sex: 'male',
      birthYear: 2005,
      heightCm: 180,
      activityLevel: 3,
      goalRateKgMonth: 1,
      proteinGPerKg: 2.2,
      fatGPerKg: 1.25,
      trainingBonusKcal: 150,
      trainingDays: 0b0010101,
      waterGoalMl: 3000,
      reminders: {
        meal: { enabled: true, time: '14:00' },
        weighIn: { enabled: true, time: '08:00' },
        weeklyReview: { enabled: false, time: '19:00' },
      },
    })
    .run();
  db.insert(schema.foods)
    .values({
      id: `food-${userId}`,
      ownerId: userId,
      source: 'user',
      name: 'Galette de sarrasin',
      kcal100g: 162,
      protein100g: 6,
      carbs100g: 30,
      fat100g: 2,
    })
    .run();
  db.insert(schema.foodPortions)
    .values({
      id: `portion-${userId}`,
      ownerId: userId,
      foodId: `food-${userId}`,
      label: '1 galette',
      grams: 50,
    })
    .run();
  db.insert(schema.favorites)
    .values({ ...common('favorite'), foodId: `food-${userId}` })
    .run();
  db.insert(schema.logEntries)
    .values({
      ...common('entry'),
      date,
      mealType: 'lunch',
      foodId: `food-${userId}`,
      label: 'Galette de sarrasin',
      grams: 100,
      kcal: 162,
      proteinG: 6,
      carbsG: 30,
      fatG: 2,
      loggedAt: new Date(),
    })
    .run();
  db.insert(schema.waterLogs)
    .values({ ...common('water'), date, ml: 250 })
    .run();
  db.insert(schema.recipes)
    .values({ ...common('recipe'), name: 'Riz au lait', servings: 4 })
    .run();
  db.insert(schema.recipeIngredients)
    .values({
      ...common('ingredient'),
      recipeId: `recipe-${userId}`,
      foodId: `food-${userId}`,
      grams: 200,
      position: 0,
    })
    .run();
  db.insert(schema.mealTemplates)
    .values({ ...common('template'), name: 'Shaker', mealType: 'snack' })
    .run();
  db.insert(schema.mealTemplateItems)
    .values({
      ...common('item'),
      templateId: `template-${userId}`,
      foodId: `food-${userId}`,
      grams: 30,
      position: 0,
    })
    .run();
  db.insert(schema.weighIns)
    .values({
      ...common('weigh-in'),
      date,
      measuredAt: new Date(),
      weightKg: 68.4,
      source: 'manual',
    })
    .run();
  db.insert(schema.measurements)
    .values({ ...common('measurement'), date, waistCm: 78 })
    .run();
  db.insert(schema.weeklyTargets)
    .values({
      ...common('target'),
      weekStart: '2026-11-02',
      maintenanceKcal: 2650,
      targetKcal: 2900,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      method: 'formula',
      status: 'insufficient_data',
    })
    .run();
  db.insert(schema.progressPhotos)
    .values({ ...common('photo'), date, pose: 'front', localUri: 'file:///photo.jpg' })
    .run();
}

function rowCounts(db: LocalDatabase): Record<string, number> {
  return Object.fromEntries(
    tableNames(db).map((name) => [
      name,
      db.get<{ count: number } | undefined>(sql.raw(`select count(*) as count from "${name}"`))
        ?.count ?? -1,
    ]),
  );
}

describe('local database', () => {
  it('creates every table of spec section 4, plus the local settings', async () => {
    const db = await createLocalDatabase();

    expect(tableNames(db)).toEqual([
      'favorites',
      'food_portions',
      'foods',
      'local_meta',
      'log_entries',
      'meal_template_items',
      'meal_templates',
      'measurements',
      'pending_changes',
      'profiles',
      'progress_photos',
      'recipe_ingredients',
      'recipes',
      'water_logs',
      'weekly_targets',
      'weigh_ins',
    ]);
  });

  it('applies the migrations once', async () => {
    const db = await createRawDatabase();
    await migrateLocalDatabase(db);
    await migrateLocalDatabase(db);

    const applied = db.all<{ id: number }>(sql`select id from __drizzle_migrations`);
    expect(applied).toHaveLength(migrations.journal.entries.length);
  });

  it('stores and reads back typed values', async () => {
    const db = await createLocalDatabase();
    fillEverything(db, alice);

    const profile = db.select().from(schema.profiles).get();
    expect(profile).toMatchObject({
      userId: alice,
      goalRateKgMonth: 1,
      reminders: { meal: { enabled: true, time: '14:00' } },
      deletedAt: null,
    });
    expect(profile?.createdAt).toBeInstanceOf(Date);
    expect(db.select().from(schema.recipeIngredients).get()?.isRaw).toBe(true);
    expect(db.select().from(schema.foods).get()?.qualityFlag).toBe('ok');
  });

  it('deletes the portions of a deleted food', async () => {
    const db = await createLocalDatabase();
    fillEverything(db, alice);

    db.delete(schema.foods)
      .where(eq(schema.foods.id, `food-${alice}`))
      .run();

    expect(db.select().from(schema.foodPortions).all()).toEqual([]);
  });
});

describe('clearLocalData', () => {
  it('empties every table', async () => {
    const db = await createLocalDatabase();
    fillEverything(db, alice);
    claimLocalData(db, alice);

    clearLocalData(db);

    expect(Object.values(rowCounts(db)).every((count) => count === 0)).toBe(true);
  });
});

describe('claimLocalData', () => {
  it('keeps the data of the same user signing in again', async () => {
    const db = await createLocalDatabase();
    claimLocalData(db, alice);
    fillEverything(db, alice);

    claimLocalData(db, alice);

    expect(db.select().from(schema.logEntries).all()).toHaveLength(1);
  });

  it('deletes the data left by another account before giving the database to the new one', async () => {
    const db = await createLocalDatabase();
    claimLocalData(db, alice);
    fillEverything(db, alice);

    claimLocalData(db, bob);

    expect(db.select().from(schema.logEntries).all()).toEqual([]);
    expect(db.select().from(schema.localMeta).all()).toEqual([
      { key: 'owner_user_id', value: bob },
    ]);
  });
});
