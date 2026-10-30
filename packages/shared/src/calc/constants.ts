// Constants of the business rules (docs/SPEC.md section 6).

/** Energy stored in one kilogram of body mass. */
export const KCAL_PER_KG = 7700;

/** Average month length used to turn a monthly rate into a daily surplus. */
export const DAYS_PER_MONTH = 30.4;

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Activity factors applied to the BMR, indexed by activity level 1 to 5. */
export const ACTIVITY_FACTORS = {
  1: 1.2, // sédentaire
  2: 1.375, // légèrement actif
  3: 1.55, // modérément actif
  4: 1.725, // actif
  5: 1.9, // très actif
} as const;

export const GOAL_RATES_KG_PER_MONTH = [0.5, 1, 1.5] as const;

export const PROFILE_DEFAULTS = {
  proteinGPerKg: 2.2,
  fatGPerKg: 1.25,
  trainingBonusKcal: 150,
  waterGoalMl: 3000,
} as const;
