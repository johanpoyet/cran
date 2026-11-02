import { KCAL_PER_GRAM } from './constants';

/** Tolerance of the coherence check: max(15 kcal, 10 % of the calories entered). */
export const COHERENCE_TOLERANCE = { kcal: 15, ratio: 0.1 } as const;

export interface FoodCoherence {
  /** 4 × proteins + 4 × carbohydrates + 9 × fat, per 100 g. */
  computedKcal: number;
  coherent: boolean;
}

/**
 * Checks the calories of a food against its macros (docs/SPEC.md section 6). A gap of max(15 kcal,
 * 10 %) or more only warns (alcohol, polyols and fibre explain real gaps): the food is saved with
 * `quality_flag = incoherent`.
 */
export function foodCoherence(values: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}): FoodCoherence {
  const computedKcal =
    KCAL_PER_GRAM.protein * values.protein +
    KCAL_PER_GRAM.carbs * values.carbs +
    KCAL_PER_GRAM.fat * values.fat;
  const tolerance = Math.max(COHERENCE_TOLERANCE.kcal, COHERENCE_TOLERANCE.ratio * values.kcal);
  return { computedKcal, coherent: Math.abs(values.kcal - computedKcal) < tolerance };
}
