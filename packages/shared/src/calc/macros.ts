import { assertPositive } from './assert';
import { KCAL_PER_GRAM, PROFILE_DEFAULTS } from './constants';
import type { Macros } from './types';

export interface MacrosInput {
  targetKcal: number;
  /** Trend weight (7-day average), or the last weigh-in when there is no trend yet. */
  weightKg: number;
  proteinGPerKg?: number;
  fatGPerKg?: number;
}

/**
 * Protein and fat come from body weight (rounded to the gram); carbs take the remaining
 * calories, rounded down so the macros never exceed the target. The training bonus therefore
 * lands entirely in carbs.
 */
export function macrosForTarget({
  targetKcal,
  weightKg,
  proteinGPerKg = PROFILE_DEFAULTS.proteinGPerKg,
  fatGPerKg = PROFILE_DEFAULTS.fatGPerKg,
}: MacrosInput): Macros {
  assertPositive('targetKcal', targetKcal);
  assertPositive('weightKg', weightKg);
  assertPositive('proteinGPerKg', proteinGPerKg);
  assertPositive('fatGPerKg', fatGPerKg);

  const proteinG = Math.round(proteinGPerKg * weightKg);
  const fatG = Math.round(fatGPerKg * weightKg);
  const remainingKcal = targetKcal - KCAL_PER_GRAM.protein * proteinG - KCAL_PER_GRAM.fat * fatG;
  if (remainingKcal < 0) {
    throw new RangeError('targetKcal is too low for the protein and fat settings');
  }
  return { proteinG, fatG, carbsG: Math.floor(remainingKcal / KCAL_PER_GRAM.carbs) };
}
