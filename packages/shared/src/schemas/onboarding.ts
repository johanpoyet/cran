import { z } from 'zod';

import { isDateKey } from '../calc/week';
import { profileFields, profileSchema } from './profile';
import { weeklyTargetSchema } from './weekly-target';

export const WEIGHT_LIMITS_KG = { min: 30, max: 250 } as const;

/** Answers of the five onboarding steps, sent once from the "Ta cible de départ" screen. */
export const onboardingSchema = z.strictObject({
  sex: profileFields.sex,
  birthYear: profileFields.birthYear,
  heightCm: profileFields.heightCm,
  activityLevel: profileFields.activityLevel,
  goalRateKgMonth: profileFields.goalRateKgMonth,
  trainingDays: profileFields.trainingDays,
  trainingBonusKcal: profileFields.trainingBonusKcal,
  /** Morning weight, kept to 0.1 kg by the picker (stored with 2 decimals). */
  weightKg: z
    .number()
    .min(WEIGHT_LIMITS_KG.min)
    .max(WEIGHT_LIMITS_KG.max)
    .refine((kg) => Math.abs(kg * 100 - Math.round(kg * 100)) < 1e-6, 'At most 2 decimals'),
  /** The user's local day, "YYYY-MM-DD": date of the first weigh-in and of the first week. */
  date: z.string().refine(isDateKey, 'Expected a date as YYYY-MM-DD'),
  /** The health data checkbox must be ticked (GDPR explicit consent). */
  healthDataConsent: z.literal(true),
});

export type Onboarding = z.infer<typeof onboardingSchema>;

export const onboardingResultSchema = z.object({
  profile: profileSchema,
  weeklyTarget: weeklyTargetSchema,
});

export type OnboardingResult = z.infer<typeof onboardingResultSchema>;
