export interface Per100g {
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
}

export interface NutritionValues {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Values of an entry (docs/SPEC.md section 6): value per 100 g × grams / 100. Never rounded here:
 * rounding happens on display only.
 */
export function nutritionFor(food: Per100g, grams: number): NutritionValues {
  const ratio = grams / 100;
  return {
    kcal: food.kcal100g * ratio,
    proteinG: food.protein100g * ratio,
    carbsG: food.carbs100g * ratio,
    fatG: food.fat100g * ratio,
  };
}
