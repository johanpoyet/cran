import {
  type Food,
  formatDecimal,
  parseDecimal,
  type RecipeCategory,
  type RecipeInput,
  recipeInputSchema,
} from '@cran/shared';
import { create } from 'zustand';

import type { RecipeDetail } from './recipes';

export interface DraftIngredient {
  food: Food;
  grams: number;
  isRaw: boolean;
}

/** Fields of "Nouvelle recette" / "Modifier la recette", as typed. */
export interface RecipeDraft {
  /** Null for a new recipe. */
  id: string | null;
  name: string;
  category: RecipeCategory | null;
  servings: number;
  cookedWeight: string;
  notes: string;
  ingredients: DraftIngredient[];
}

export function emptyDraft(): RecipeDraft {
  return {
    id: null,
    name: '',
    category: null,
    servings: 4,
    cookedWeight: '',
    notes: '',
    ingredients: [],
  };
}

export function draftFromRecipe(recipe: RecipeDetail): RecipeDraft {
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    servings: recipe.servings,
    cookedWeight: recipe.cookedWeightG === null ? '' : formatDecimal(recipe.cookedWeightG),
    notes: recipe.notes ?? '',
    ingredients: recipe.ingredients.map(({ food, grams, isRaw }) => ({ food, grams, isRaw })),
  };
}

export type RecipeDraftError = 'name' | 'ingredients' | 'cookedWeight';

export type RecipeDraftValidation =
  { ok: true; recipe: RecipeInput } | { ok: false; error: RecipeDraftError };

/** Checks the draft against the shared schema; the first problem is reported. */
export function validateDraft(draft: RecipeDraft): RecipeDraftValidation {
  const typedWeight = draft.cookedWeight.trim();
  const cookedWeightG = typedWeight === '' ? null : parseDecimal(typedWeight);
  if (typedWeight !== '' && cookedWeightG === null) return { ok: false, error: 'cookedWeight' };
  const result = recipeInputSchema.safeParse({
    name: draft.name,
    category: draft.category,
    servings: draft.servings,
    cookedWeightG,
    notes: draft.notes,
    ingredients: draft.ingredients.map(({ food, grams, isRaw }) => ({
      foodId: food.id,
      grams,
      isRaw,
    })),
  });
  if (result.success) return { ok: true, recipe: result.data };
  const path = result.error.issues[0]?.path[0];
  if (path === 'name') return { ok: false, error: 'name' };
  if (path === 'cookedWeightG') return { ok: false, error: 'cookedWeight' };
  return { ok: false, error: 'ingredients' };
}

interface RecipeDraftState {
  draft: RecipeDraft;
  start: (draft: RecipeDraft) => void;
  update: (changes: Partial<Omit<RecipeDraft, 'id' | 'ingredients'>>) => void;
  /** `index`: replaces that ingredient; null adds one at the end. */
  setIngredient: (index: number | null, ingredient: DraftIngredient) => void;
  removeIngredient: (index: number) => void;
}

/**
 * The recipe being created or edited, shared with the ingredient sheet opened on top of the form
 * (spec section 3: Zustand for the UI state).
 */
export const useRecipeDraft = create<RecipeDraftState>()((set) => ({
  draft: emptyDraft(),
  start: (draft) => {
    set({ draft });
  },
  update: (changes) => {
    set((state) => ({ draft: { ...state.draft, ...changes } }));
  },
  setIngredient: (index, ingredient) => {
    set((state) => {
      const ingredients = [...state.draft.ingredients];
      if (index === null || index >= ingredients.length) ingredients.push(ingredient);
      else ingredients[index] = ingredient;
      return { draft: { ...state.draft, ingredients } };
    });
  },
  removeIngredient: (index) => {
    set((state) => ({
      draft: {
        ...state.draft,
        ingredients: state.draft.ingredients.filter((_, position) => position !== index),
      },
    }));
  },
}));
