import type { LocalDatabase } from '../db/types';
import { addEntries, copyEntries, readMealEntries, updateEntry } from '../journal';
import { basmati } from '../test/foods';
import { createLocalDatabase } from '../test/local-database';
import { curry, foods } from '../test/recipes';
import { readRecentRecipes, searchRecipes } from './log';
import { deleteRecipe, readRecipe, type RecipeDetail, saveRecipe } from './recipes';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const userId = '0192f0c0-0000-7000-8000-00000000a11c';
const lunch = new Date(2026, 10, 5, 12, 30);

let db: LocalDatabase;
let recipe: RecipeDetail;

beforeEach(async () => {
  db = await createLocalDatabase();
  const id = saveRecipe(db, userId, { ...curry, cookedWeightG: 2100 }, foods);
  recipe = read(id);
});

function read(id: string): RecipeDetail {
  const found = readRecipe(db, userId, id);
  if (!found) throw new Error('Recipe not saved');
  return found;
}

function lunchEntries() {
  return readMealEntries(db, userId, '2026-11-05', 'lunch');
}

describe('logging a recipe', () => {
  it('logs servings with their weight, and a weighed portion (S6-2)', () => {
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [
        { recipe, amount: { servings: 2 } },
        { recipe, amount: { grams: 525 } },
      ],
      at: lunch,
    });

    const [parts, weighed] = lunchEntries();
    expect(parts).toMatchObject({
      recipeId: recipe.id,
      foodId: null,
      label: 'Poulet riz curry',
      grams: 1050,
      servings: 2,
    });
    expect(Math.round(parts?.kcal ?? 0)).toBe(1228);
    expect(weighed).toMatchObject({ grams: 525, servings: null });
    expect(Math.round(weighed?.kcal ?? 0)).toBe(614);
  });

  it('logs servings without a weight when the cooked weight is unknown', () => {
    const id = saveRecipe(db, userId, curry, foods);
    const uncooked = read(id);

    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ recipe: uncooked, amount: { servings: 1 } }],
      at: lunch,
    });

    expect(lunchEntries()[0]).toMatchObject({ grams: null, servings: 1 });
  });

  it('refuses a weighed portion of a recipe without a cooked weight', () => {
    const id = saveRecipe(db, userId, curry, foods);
    const uncooked = read(id);

    expect(() => {
      addEntries(db, userId, {
        mealType: 'lunch',
        items: [{ recipe: uncooked, amount: { grams: 300 } }],
        at: lunch,
      });
    }).toThrow();
    expect(lunchEntries()).toEqual([]);
  });

  it('changes the servings of an entry, its weight and values following', () => {
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ recipe, amount: { servings: 2 } }],
      at: lunch,
    });
    const [entry] = lunchEntries();

    updateEntry(db, userId, entry?.id ?? '', { servings: 1 });

    const [changed] = lunchEntries();
    expect(changed).toMatchObject({ servings: 1, grams: 525 });
    expect(Math.round(changed?.kcal ?? 0)).toBe(614);
  });

  it('never changes a recipe entry in servings by grams', () => {
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ recipe, amount: { servings: 2 } }],
      at: lunch,
    });
    const [entry] = lunchEntries();

    updateEntry(db, userId, entry?.id ?? '', { grams: 100 });

    expect(lunchEntries()[0]).toMatchObject({ servings: 2, grams: 1050 });
  });

  it("copies the servings with yesterday's meal", () => {
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ recipe, amount: { servings: 2 } }],
      at: new Date(2026, 10, 4, 12, 30),
    });

    copyEntries(db, userId, readMealEntries(db, userId, '2026-11-04', 'lunch'), {
      mealType: 'lunch',
      at: lunch,
    });

    expect(lunchEntries()[0]).toMatchObject({ recipeId: recipe.id, servings: 2, grams: 1050 });
  });
});

describe('readRecentRecipes', () => {
  it('gives the recipes of the latest entries, most recent first, each once', () => {
    const id = saveRecipe(db, userId, { ...curry, name: 'Overnight oats' }, foods);
    const oats = read(id);
    const log = (item: RecipeDetail, at: Date) => {
      addEntries(db, userId, {
        mealType: 'lunch',
        items: [{ recipe: item, amount: { servings: 1 } }],
        at,
      });
    };
    log(recipe, new Date(2026, 10, 3, 12));
    log(oats, new Date(2026, 10, 4, 8));
    log(recipe, new Date(2026, 10, 5, 12));
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ food: basmati, grams: 100 }],
      at: lunch,
    });

    expect(readRecentRecipes(db, userId, 20).map(({ name }) => name)).toEqual([
      'Poulet riz curry',
      'Overnight oats',
    ]);
    expect(readRecentRecipes(db, userId, 1)).toHaveLength(1);
    expect(readRecentRecipes(db, 'someone-else', 20)).toEqual([]);
  });

  it('leaves out a deleted recipe', () => {
    addEntries(db, userId, {
      mealType: 'lunch',
      items: [{ recipe, amount: { servings: 1 } }],
      at: lunch,
    });

    deleteRecipe(db, userId, recipe.id);

    expect(readRecentRecipes(db, userId, 20)).toEqual([]);
  });
});

describe('searchRecipes', () => {
  it('matches every word, accents and case ignored', () => {
    const recipes = [
      { name: 'Poulet riz curry' },
      { name: 'Riz au lait maison' },
      { name: 'Pâtes' },
    ];

    expect(searchRecipes(recipes, 'RIZ')).toHaveLength(2);
    expect(searchRecipes(recipes, 'curry poulet')).toEqual([{ name: 'Poulet riz curry' }]);
    expect(searchRecipes(recipes, 'pate')).toEqual([{ name: 'Pâtes' }]);
    expect(searchRecipes(recipes, '  ')).toHaveLength(3);
  });
});
