import { skyr } from '../test/foods';
import {
  draftFromRecipe,
  emptyDraft,
  type RecipeDraft,
  useRecipeDraft,
  validateDraft,
} from './draft';

const draft: RecipeDraft = {
  ...emptyDraft(),
  name: 'Overnight oats',
  category: 'breakfast',
  servings: 1,
  ingredients: [{ food: skyr, grams: 150, isRaw: false }],
};

describe('validateDraft', () => {
  it('turns the draft into a recipe', () => {
    expect(validateDraft({ ...draft, cookedWeight: '1 250,5', notes: ' ' })).toEqual({
      ok: true,
      recipe: {
        name: 'Overnight oats',
        category: 'breakfast',
        servings: 1,
        cookedWeightG: 1250.5,
        notes: null,
        ingredients: [{ foodId: skyr.id, grams: 150, isRaw: false }],
      },
    });
  });

  it.each<[string, Partial<RecipeDraft>]>([
    ['name', { name: '  ' }],
    ['ingredients', { ingredients: [] }],
    ['cookedWeight', { cookedWeight: 'beaucoup' }],
    ['cookedWeight', { cookedWeight: '0' }],
  ])('reports %s', (error, change) => {
    expect(validateDraft({ ...draft, ...change })).toEqual({ ok: false, error });
  });
});

describe('draftFromRecipe', () => {
  it('fills the form with a saved recipe', () => {
    expect(
      draftFromRecipe({
        id: 'r1',
        name: 'Poulet riz curry',
        category: 'meal_prep',
        servings: 4,
        cookedWeightG: 2100,
        notes: null,
        ingredientCount: 1,
        ingredients: [
          {
            id: 'i1',
            food: skyr,
            grams: 800,
            isRaw: true,
            values: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
          },
        ],
        total: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        perServing: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        servingWeightG: 525,
      }),
    ).toEqual({
      id: 'r1',
      name: 'Poulet riz curry',
      category: 'meal_prep',
      servings: 4,
      cookedWeight: '2 100',
      notes: '',
      ingredients: [{ food: skyr, grams: 800, isRaw: true }],
    });
  });
});

describe('useRecipeDraft', () => {
  it('adds, replaces and removes ingredients', () => {
    const store = useRecipeDraft.getState();
    store.start(emptyDraft());
    const egg = { ...skyr, id: 'egg', name: 'Œuf' };

    store.setIngredient(null, { food: skyr, grams: 100, isRaw: false });
    store.setIngredient(null, { food: egg, grams: 50, isRaw: true });
    store.setIngredient(0, { food: skyr, grams: 200, isRaw: false });
    expect(useRecipeDraft.getState().draft.ingredients.map((item) => item.grams)).toEqual([
      200, 50,
    ]);

    store.removeIngredient(0);
    expect(useRecipeDraft.getState().draft.ingredients.map((item) => item.food.name)).toEqual([
      'Œuf',
    ]);
  });
});
