import { z } from 'zod';

/** Fixed categories of a recipe (decision of Johan, S6-1), stored as these keys. */
export const RECIPE_CATEGORIES = ['meal_prep', 'breakfast', 'snack', 'other'] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export function isRecipeCategory(value: string | null | undefined): value is RecipeCategory {
  return RECIPE_CATEGORIES.some((category) => category === value);
}

export const RECIPE_LIMITS = {
  nameMax: 100,
  servingsMin: 1,
  servingsMax: 50,
  ingredientsMax: 50,
  ingredientGramsMax: 5000,
  cookedWeightMax: 20_000,
  notesMax: 1000,
  /** Servings logged at once in the journal (S6-2). */
  loggedServingsMax: 20,
  /** Weighed portion logged in the journal. */
  portionGramsMax: 5000,
} as const;

export const recipeIngredientInputSchema = z.object({
  foodId: z.uuid(),
  grams: z.number().positive().max(RECIPE_LIMITS.ingredientGramsMax),
  /** Weighed raw ("CRU" on the recipe sheet). */
  isRaw: z.boolean(),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;

/** "Nouvelle recette" and its edition. */
export const recipeInputSchema = z.object({
  name: z.string().trim().min(1).max(RECIPE_LIMITS.nameMax),
  category: z.enum(RECIPE_CATEGORIES).nullable(),
  servings: z.number().int().min(RECIPE_LIMITS.servingsMin).max(RECIPE_LIMITS.servingsMax),
  cookedWeightG: z.number().positive().max(RECIPE_LIMITS.cookedWeightMax).nullable(),
  notes: z
    .string()
    .trim()
    .max(RECIPE_LIMITS.notesMax)
    .transform((notes) => (notes === '' ? null : notes))
    .nullable(),
  ingredients: z.array(recipeIngredientInputSchema).min(1).max(RECIPE_LIMITS.ingredientsMax),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
