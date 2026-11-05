import { eq } from 'drizzle-orm';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { addEntries, addQuickEntry, readMealEntries } from '../journal';
import { readRecipe, type RecipeDetail, saveRecipe, setRecipeCookedWeight } from '../recipes';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { curry, foods } from '../test/recipes';
import {
  applyTemplate,
  deleteTemplate,
  type MealTemplate,
  readTemplates,
  renameTemplate,
  saveTemplate,
} from './templates';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const alice = '0192f0c0-0000-7000-8000-00000000a11c';
const bob = '0192f0c0-0000-7000-8000-000000000b0b';
const yesterday = new Date(2026, 10, 4, 20);
const today = new Date(2026, 10, 5, 20);

let db: LocalDatabase;
let recipe: RecipeDetail;

beforeEach(async () => {
  db = await createLocalDatabase();
  const found = readRecipe(
    db,
    alice,
    saveRecipe(db, alice, { ...curry, cookedWeightG: 2100 }, foods),
  );
  if (!found) throw new Error('Recipe not saved');
  recipe = found;
});

/** Yesterday's dinner: rice, 2 servings of the curry, a weighed portion and a quick add. */
function logDinner() {
  addEntries(db, alice, {
    mealType: 'dinner',
    items: [
      { food: basmati, grams: 250 },
      { recipe, amount: { servings: 2 } },
      { recipe, amount: { grams: 300 } },
    ],
    at: yesterday,
  });
  addQuickEntry(db, alice, {
    mealType: 'dinner',
    entry: { label: '', kcal: 200, proteinG: 0, carbsG: 0, fatG: 0 },
    label: 'Ajout rapide',
    at: yesterday,
  });
  return readMealEntries(db, alice, '2026-11-04', 'dinner');
}

function only(templates: MealTemplate[]): MealTemplate {
  const [template] = templates;
  if (!template) throw new Error('No template');
  return template;
}

describe('saveTemplate', () => {
  it('keeps the foods and recipes with their quantity, not the quick adds (S6-3)', () => {
    const saved = saveTemplate(db, alice, {
      name: '  Dîner prise de masse ',
      mealType: 'dinner',
      entries: logDinner(),
    });

    expect(saved?.count).toBe(3);
    const template = only(readTemplates(db, alice));
    expect(template).toMatchObject({ name: 'Dîner prise de masse', mealType: 'dinner' });
    expect(template.items).toEqual([
      { food: expect.objectContaining({ id: basmati.id }) as unknown, grams: 250 },
      { recipe: expect.objectContaining({ id: recipe.id }) as unknown, amount: { servings: 2 } },
      { recipe: expect.objectContaining({ id: recipe.id }) as unknown, amount: { grams: 300 } },
    ]);
    // 325 + 2 × 614 + 2 456 × 300 / 2 100.
    expect(Math.round(template.kcal)).toBe(1904);
  });

  it('saves nothing for a meal of quick adds only', () => {
    addQuickEntry(db, alice, {
      mealType: 'snack',
      entry: { label: '', kcal: 300, proteinG: 0, carbsG: 0, fatG: 0 },
      label: 'Ajout rapide',
      at: today,
    });

    expect(
      saveTemplate(db, alice, {
        name: 'Collation',
        mealType: 'snack',
        entries: readMealEntries(db, alice, '2026-11-05', 'snack'),
      }),
    ).toBeNull();
    expect(readTemplates(db, alice)).toEqual([]);
  });

  it('is queued for the sync', () => {
    saveTemplate(db, alice, { name: 'Dîner', mealType: 'dinner', entries: logDinner() });

    const queued = db
      .select({ table: schema.pendingChanges.tableName })
      .from(schema.pendingChanges)
      .all()
      .map(({ table }) => table);
    expect(queued.filter((table) => table === 'meal_templates')).toHaveLength(1);
    expect(queued.filter((table) => table === 'meal_template_items')).toHaveLength(3);
  });
});

describe('readTemplates', () => {
  it('lists the latest first, and only the user’s', () => {
    const entries = logDinner();
    saveTemplate(db, alice, { name: 'Ancien', mealType: 'dinner', entries });
    db.update(schema.mealTemplates)
      .set({ createdAt: new Date(2026, 0, 1) })
      .run();
    saveTemplate(db, alice, { name: 'Récent', mealType: 'lunch', entries });

    expect(readTemplates(db, alice).map(({ name }) => name)).toEqual(['Récent', 'Ancien']);
    expect(readTemplates(db, bob)).toEqual([]);
  });

  it('leaves out an item whose food or recipe is gone, or that can no longer be weighed', () => {
    saveTemplate(db, alice, { name: 'Dîner', mealType: 'dinner', entries: logDinner() });

    setRecipeCookedWeight(db, alice, recipe.id, null);
    expect(only(readTemplates(db, alice)).items).toHaveLength(2);

    db.update(schema.foods).set({ deletedAt: today }).where(eq(schema.foods.id, basmati.id)).run();
    expect(only(readTemplates(db, alice)).items).toEqual([
      { recipe: expect.objectContaining({ id: recipe.id }) as unknown, amount: { servings: 2 } },
    ]);
  });
});

describe('applyTemplate', () => {
  it('adds the items to a meal of today, with the current values', () => {
    saveTemplate(db, alice, { name: 'Dîner', mealType: 'dinner', entries: logDinner() });

    applyTemplate(db, alice, only(readTemplates(db, alice)), { mealType: 'lunch', at: today });

    const lunch = readMealEntries(db, alice, '2026-11-05', 'lunch');
    expect(lunch.map(({ label, grams, servings }) => [label, grams, servings])).toEqual([
      ['Riz basmati cuit', 250, null],
      ['Poulet riz curry', 1050, 2],
      ['Poulet riz curry', 300, null],
    ]);
  });
});

describe('renameTemplate and deleteTemplate', () => {
  it('renames, ignoring an empty name, and deletes with the items', () => {
    const saved = saveTemplate(db, alice, {
      name: 'Dîner',
      mealType: 'dinner',
      entries: logDinner(),
    });
    const id = saved?.id ?? '';

    renameTemplate(db, alice, id, ' Dîner du soir ');
    renameTemplate(db, alice, id, '  ');
    renameTemplate(db, bob, id, 'Volé');
    expect(only(readTemplates(db, alice)).name).toBe('Dîner du soir');

    deleteTemplate(db, bob, id);
    expect(readTemplates(db, alice)).toHaveLength(1);
    deleteTemplate(db, alice, id);
    expect(readTemplates(db, alice)).toEqual([]);
    expect(
      db
        .select()
        .from(schema.mealTemplateItems)
        .all()
        .every(({ deletedAt }) => deletedAt !== null),
    ).toBe(true);
  });

  it('never touches another user’s items when deleting', () => {
    saveTemplate(db, alice, { name: 'Dîner', mealType: 'dinner', entries: logDinner() });
    const id = only(readTemplates(db, alice)).id;

    deleteTemplate(db, bob, id);

    expect(
      db
        .select()
        .from(schema.mealTemplateItems)
        .all()
        .every(({ deletedAt }) => deletedAt === null),
    ).toBe(true);
  });
});
