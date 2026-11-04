import {
  type Food,
  type FoodCoherence,
  foodCoherence,
  type FoodPortionInput,
  foodPortionInputSchema,
  formatDecimal,
  type NewFood,
  newFoodSchema,
  parseDecimal,
} from '@cran/shared';

/** Fields of the "Nouvel aliment" screen, as typed (numbers stay text until saved). */
export interface NewFoodForm {
  name: string;
  brand: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  portions: FoodPortionInput[];
  favorite: boolean;
}

export type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat';
export const NUTRIENT_KEYS: readonly NutrientKey[] = ['kcal', 'protein', 'carbs', 'fat'];

/** `name`: prefilled from the search ("Créer « galette »"). */
export function emptyNewFoodForm(name = ''): NewFoodForm {
  return {
    name,
    brand: '',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
    portions: [],
    favorite: false,
  };
}

/**
 * The form prefilled with a product to correct (Open Food Facts values judged wrong): name, brand,
 * values per 100 g as typed in French, and the serving as a named portion.
 */
export function newFoodFormFrom(food: Food, servingLabel: string): NewFoodForm {
  return {
    name: food.name,
    brand: food.brand ?? '',
    kcal: formatDecimal(food.kcal100g),
    protein: formatDecimal(food.protein100g),
    carbs: formatDecimal(food.carbs100g),
    fat: formatDecimal(food.fat100g),
    portions:
      food.defaultPortionG === null ? [] : [{ label: servingLabel, grams: food.defaultPortionG }],
    favorite: false,
  };
}

/** The four values per 100 g, or null while one of them is empty or not a number. */
export function nutrientValues(form: NewFoodForm): Record<NutrientKey, number> | null {
  const kcal = parseDecimal(form.kcal);
  const protein = parseDecimal(form.protein);
  const carbs = parseDecimal(form.carbs);
  const fat = parseDecimal(form.fat);
  if (kcal === null || protein === null || carbs === null || fat === null) return null;
  return { kcal, protein, carbs, fat };
}

/** Coherence of the values typed so far, with the calories typed; null until all four are filled. */
export function liveCoherence(form: NewFoodForm): (FoodCoherence & { kcal: number }) | null {
  const values = nutrientValues(form);
  return values ? { ...foodCoherence(values), kcal: values.kcal } : null;
}

/** The save button stays disabled until the name and the four values are typed. */
export function canSave(form: NewFoodForm): boolean {
  return form.name.trim() !== '' && NUTRIENT_KEYS.every((key) => form[key].trim() !== '');
}

export type NewFoodError = 'name' | 'kcal' | 'macro' | 'macrosTotal';

export type NewFoodValidation =
  | { ok: true; food: NewFood }
  | { ok: false; error: NewFoodError; field: NutrientKey | 'name' | null };

/** Checks the form against the shared schema; the first problem is reported. */
export function validateNewFood(form: NewFoodForm): NewFoodValidation {
  for (const key of NUTRIENT_KEYS) {
    if (parseDecimal(form[key]) === null) {
      return { ok: false, error: key === 'kcal' ? 'kcal' : 'macro', field: key };
    }
  }
  const result = newFoodSchema.safeParse({
    name: form.name,
    brand: form.brand,
    kcal100g: parseDecimal(form.kcal),
    protein100g: parseDecimal(form.protein),
    carbs100g: parseDecimal(form.carbs),
    fat100g: parseDecimal(form.fat),
    portions: form.portions,
  });
  if (result.success) return { ok: true, food: result.data };

  const path = result.error.issues[0]?.path[0];
  switch (path) {
    case 'name':
      return { ok: false, error: 'name', field: 'name' };
    case 'kcal100g':
      return { ok: false, error: 'kcal', field: 'kcal' };
    case 'protein100g':
      return { ok: false, error: 'macro', field: 'protein' };
    case 'carbs100g':
      return { ok: false, error: 'macro', field: 'carbs' };
    case 'fat100g':
      return { ok: false, error: 'macro', field: 'fat' };
    default:
      return { ok: false, error: 'macrosTotal', field: null };
  }
}

/** A named portion typed in the form ("1 galette", "50"), or null if incomplete or invalid. */
export function parsePortion(label: string, grams: string): FoodPortionInput | null {
  const result = foodPortionInputSchema.safeParse({ label, grams: parseDecimal(grams) });
  return result.success ? result.data : null;
}
