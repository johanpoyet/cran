import type { Food } from '@cran/shared';

import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';
import { food } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import {
  deleteRecipe,
  readRecipe,
  readRecipes,
  saveRecipe,
  setRecipeCookedWeight,
  setRecipeServings,
} from './recipes';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const userId = '0192f0c0-0000-7000-8000-00000000a11c';
const otherId = '0192f0c0-0000-7000-8000-0000000b0b00';

// "Poulet riz curry" of mockup 15: values per 100 g as on the mockup.
const poulet = food({
  id: '0192f0c0-0000-7000-8000-000000000001',
  name: 'Blanc de poulet',
  kcal100g: 120,
  protein100g: 23,
  carbs100g: 0,
  fat100g: 1.5,
});
const riz = food({
  id: '0192f0c0-0000-7000-8000-000000000002',
  name: 'Riz basmati',
  kcal100g: 350,
  protein100g: 7.5,
  carbs100g: 78,
  fat100g: 0.9,
});
const brocolis = food({
  id: '0192f0c0-0000-7000-8000-000000000003',
  name: 'Brocolis',
  kcal100g: 34,
  protein100g: 2.8,
  carbs100g: 7,
  fat100g: 0.4,
});
const coco = food({
  id: '0192f0c0-0000-7000-8000-000000000004',
  name: 'Lait de coco léger',
  kcal100g: 70,
  protein100g: 0.7,
  carbs100g: 2.5,
  fat100g: 6,
});
const curryPaste = food({
  id: '0192f0c0-0000-7000-8000-000000000005',
  name: 'Pâte de curry',
  kcal100g: 250,
  protein100g: 5,
  carbs100g: 20,
  fat100g: 15,
});
const foods: Food[] = [poulet, riz, brocolis, coco, curryPaste];

const curry = {
  name: 'Poulet riz curry',
  category: 'meal_prep' as const,
  servings: 4,
  cookedWeightG: null,
  notes: null,
  ingredients: [
    { foodId: poulet.id, grams: 800, isRaw: true },
    { foodId: riz.id, grams: 320, isRaw: true },
    { foodId: brocolis.id, grams: 400, isRaw: false },
    { foodId: coco.id, grams: 200, isRaw: false },
    { foodId: curryPaste.id, grams: 40, isRaw: false },
  ],
};

let db: LocalDatabase;

beforeEach(async () => {
  db = await createLocalDatabase();
});

describe('recipes', () => {
  it('saves the "Poulet riz curry" with about 614 kcal per serving (S6-1)', () => {
    const id = saveRecipe(db, userId, curry, foods);

    const recipe = readRecipe(db, userId, id);
    expect(Math.round(recipe?.perServing.kcal ?? 0)).toBe(614);
    expect(recipe).toEqual(
      expect.objectContaining({
        name: 'Poulet riz curry',
        category: 'meal_prep',
        servings: 4,
        ingredientCount: 5,
        servingWeightG: null,
      }),
    );
    expect(recipe?.ingredients.map((item) => [item.food.name, item.grams, item.isRaw])).toEqual([
      ['Blanc de poulet', 800, true],
      ['Riz basmati', 320, true],
      ['Brocolis', 400, false],
      ['Lait de coco léger', 200, false],
      ['Pâte de curry', 40, false],
    ]);
    expect(recipe?.ingredients[0]?.values.kcal).toBe(960);
  });

  it('copies the global foods used on the phone', () => {
    saveRecipe(db, userId, curry, foods);

    expect(db.select().from(schema.foods).all()).toHaveLength(5);
  });

  it('replaces the ingredients when the recipe is edited', () => {
    const id = saveRecipe(db, userId, curry, foods);

    saveRecipe(
      db,
      userId,
      { ...curry, name: 'Poulet riz', ingredients: curry.ingredients.slice(0, 2) },
      foods,
      id,
    );

    const recipe = readRecipe(db, userId, id);
    expect(recipe?.name).toBe('Poulet riz');
    expect(recipe?.ingredients.map((item) => item.food.name)).toEqual([
      'Blanc de poulet',
      'Riz basmati',
    ]);
    // The previous rows are soft-deleted, for the sync.
    expect(db.select().from(schema.recipeIngredients).all()).toHaveLength(7);
  });

  it('changes the servings and the cooked weight from the sheet', () => {
    const id = saveRecipe(db, userId, curry, foods);

    setRecipeServings(db, userId, id, 5);
    setRecipeCookedWeight(db, userId, id, 2100);

    const recipe = readRecipe(db, userId, id);
    expect(recipe?.servings).toBe(5);
    expect(recipe?.servingWeightG).toBe(420);
    expect(Math.round(recipe?.perServing.kcal ?? 0)).toBe(491);
  });

  it('lists the recipes of the user by name, never those of another user', () => {
    saveRecipe(db, userId, curry, foods);
    saveRecipe(db, userId, { ...curry, name: 'Bowl bœuf patate douce' }, foods);
    saveRecipe(db, otherId, { ...curry, name: 'Recette de Bob' }, foods);

    expect(readRecipes(db, userId).map((recipe) => recipe.name)).toEqual([
      'Bowl bœuf patate douce',
      'Poulet riz curry',
    ]);
  });

  it('deletes a recipe and its ingredients', () => {
    const id = saveRecipe(db, userId, curry, foods);

    deleteRecipe(db, userId, id);

    expect(readRecipe(db, userId, id)).toBeNull();
    expect(readRecipes(db, userId)).toEqual([]);
    expect(
      db
        .select()
        .from(schema.recipeIngredients)
        .all()
        .every((row) => row.deletedAt !== null),
    ).toBe(true);
  });

  it("does not read another user's recipe", () => {
    const id = saveRecipe(db, otherId, curry, foods);

    expect(readRecipe(db, userId, id)).toBeNull();
  });
});
