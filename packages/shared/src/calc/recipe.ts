import type { NutritionValues, Per100g } from './nutrition';
import { nutritionFor } from './nutrition';

export interface RecipeIngredientValues {
  food: Per100g;
  grams: number;
}

export interface RecipeNutrition {
  /** Sum of the ingredients. */
  total: NutritionValues;
  /** Total / servings. */
  perServing: NutritionValues;
  /** Weight of one serving of the cooked dish; null without a cooked weight. */
  servingWeightG: number | null;
}

const ZERO: NutritionValues = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function add(a: NutritionValues, b: NutritionValues): NutritionValues {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

function scale(values: NutritionValues, ratio: number): NutritionValues {
  return {
    kcal: values.kcal * ratio,
    proteinG: values.proteinG * ratio,
    carbsG: values.carbsG * ratio,
    fatG: values.fatG * ratio,
  };
}

/**
 * Values of a recipe (docs/SPEC.md section 6): totals = sum of the ingredients, per serving =
 * totals / servings. Never rounded here.
 */
export function recipeNutrition(
  ingredients: readonly RecipeIngredientValues[],
  servings: number,
  cookedWeightG: number | null,
): RecipeNutrition {
  const total = ingredients.reduce(
    (sum, { food, grams }) => add(sum, nutritionFor(food, grams)),
    ZERO,
  );
  const valid = servings > 0;
  return {
    total,
    perServing: valid ? scale(total, 1 / servings) : ZERO,
    servingWeightG:
      valid && cookedWeightG !== null && cookedWeightG > 0 ? cookedWeightG / servings : null,
  };
}

/**
 * A weighed portion of the cooked dish (docs/SPEC.md section 6): totals × grams / cooked weight.
 * Null without a cooked weight.
 */
export function weighedPortion(
  total: NutritionValues,
  cookedWeightG: number | null,
  grams: number,
): NutritionValues | null {
  if (cookedWeightG === null || cookedWeightG <= 0) return null;
  return scale(total, grams / cookedWeightG);
}

/** What is logged of a recipe: a number of servings, or a weighed portion of the cooked dish. */
export type RecipeAmount = { servings: number } | { grams: number };

export interface RecipePortion {
  values: NutritionValues;
  /** Weight of the portion; null for servings of a recipe without a cooked weight. */
  grams: number | null;
  /** Null for a weighed portion. */
  servings: number | null;
}

/**
 * A portion of a recipe as logged in the journal: n servings (n × the values per serving, n × the
 * weight of a serving when the cooked weight is known) or a weighed portion. Null for a weighed
 * portion of a recipe without a cooked weight.
 */
export function recipePortion(
  recipe: RecipeNutrition & { cookedWeightG: number | null },
  amount: RecipeAmount,
): RecipePortion | null {
  if ('servings' in amount) {
    const { servings } = amount;
    return {
      values: scale(recipe.perServing, servings),
      grams: recipe.servingWeightG === null ? null : recipe.servingWeightG * servings,
      servings,
    };
  }
  const values = weighedPortion(recipe.total, recipe.cookedWeightG, amount.grams);
  return values ? { values, grams: amount.grams, servings: null } : null;
}
