import type { Food } from '@cran/shared';
import { create } from 'zustand';

import type { RecipeToAdd } from './add-entries';

export interface SelectedFood {
  food: Food;
  grams: number;
  /** Named portion chosen in the quantity sheet, null for a quantity in grams. */
  portionLabel: string | null;
}

interface AddSelectionState {
  selected: ReadonlyMap<string, SelectedFood>;
  /** Recipes selected, by id, with their servings or weighed portion (S6-2). */
  recipes: ReadonlyMap<string, RecipeToAdd>;
  /** Foods shown in the add sheet, for the quantity sheet opened from it (server results too). */
  shown: ReadonlyMap<string, Food>;
  show: (foods: readonly Food[]) => void;
  select: (item: SelectedFood) => void;
  unselect: (foodId: string) => void;
  selectRecipe: (item: RecipeToAdd) => void;
  unselectRecipe: (recipeId: string) => void;
  clear: () => void;
}

/**
 * Selection of the add sheet, shared with the quantity sheet opened on top of it (spec section 3:
 * Zustand for the UI state). Cleared when the add sheet closes.
 */
export const useAddSelection = create<AddSelectionState>()((set) => ({
  selected: new Map(),
  recipes: new Map(),
  shown: new Map(),
  show: (foods) => {
    set((state) => {
      if (foods.every((food) => state.shown.get(food.id) === food)) return state;
      const shown = new Map(state.shown);
      for (const food of foods) shown.set(food.id, food);
      return { shown };
    });
  },
  select: (item) => {
    set((state) => ({ selected: new Map(state.selected).set(item.food.id, item) }));
  },
  unselect: (foodId) => {
    set((state) => {
      const selected = new Map(state.selected);
      selected.delete(foodId);
      return { selected };
    });
  },
  selectRecipe: (item) => {
    set((state) => ({ recipes: new Map(state.recipes).set(item.recipe.id, item) }));
  },
  unselectRecipe: (recipeId) => {
    set((state) => {
      const recipes = new Map(state.recipes);
      recipes.delete(recipeId);
      return { recipes };
    });
  },
  clear: () => {
    set({ selected: new Map(), recipes: new Map(), shown: new Map() });
  },
}));
