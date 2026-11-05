import { formatDecimal, formatGrams, formatKcal, type NutritionValues } from '@cran/shared';
import type { TFunction } from 'i18next';

/** Below this, the main macro of an ingredient is not worth showing ("Pâte de curry · 100 kcal"). */
const MAIN_MACRO_MIN_G = 10;

const MACROS = [
  ['protein', 'proteinG'],
  ['carbs', 'carbsG'],
  ['fat', 'fatG'],
] as const;

/**
 * Values of an ingredient for its quantity, as on mockup 15: the calories and the main macro
 * ("960 kcal · P 184 g", "1 120 kcal · G 250 g").
 */
export function ingredientDetails(t: TFunction, values: NutritionValues): string {
  const kcal = formatKcal(Math.round(values.kcal));
  const [main] = [...MACROS].sort(([, a], [, b]) => values[b] - values[a]);
  if (!main || values[main[1]] < MAIN_MACRO_MIN_G) return kcal;
  return t('recipes.ingredientDetails', {
    kcal,
    macro: t(`recipes.macroLetters.${main[0]}`),
    grams: formatGrams(Math.round(values[main[1]])),
  });
}

/** "1 part", "1,5 part", "2 parts": servings logged in the journal. */
export function servingsLabel(t: TFunction, servings: number): string {
  return t('recipes.log.parts', { count: servings, value: formatDecimal(servings) });
}
