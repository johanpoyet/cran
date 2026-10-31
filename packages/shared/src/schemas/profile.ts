import { z } from 'zod';

import { GOAL_RATES_KG_PER_MONTH, PROFILE_DEFAULTS } from '../calc/constants';

// Profile and settings (docs/SPEC.md section 4, table `profiles`), shared by the API and the app.

/** Bounds accepted for a profile; the app's pickers stay within them. */
export const PROFILE_LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 120, max: 230 },
  proteinGPerKg: { min: 1.2, max: 3.5 },
  fatGPerKg: { min: 0.5, max: 2 },
  trainingBonusKcal: { min: 0, max: 1000 },
  waterGoalMl: { min: 500, max: 10_000 },
} as const;

/** Training days as a 7-bit mask, Monday = bit 0 (see calc/training-days). */
const ALL_DAYS_MASK = 0b1111111;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a time as HH:MM');

export const reminderSchema = z.object({ enabled: z.boolean(), time });

/** Reminders of the "Objectifs" screen: meal, weigh-in and Sunday review. */
export const remindersSchema = z.object({
  meal: reminderSchema,
  weighIn: reminderSchema,
  weeklyReview: reminderSchema,
});

export type Reminder = z.infer<typeof reminderSchema>;
export type Reminders = z.infer<typeof remindersSchema>;

// Values shown on the "Objectifs" mockup.
export const DEFAULT_REMINDERS: Reminders = {
  meal: { enabled: true, time: '14:00' },
  weighIn: { enabled: true, time: '08:00' },
  weeklyReview: { enabled: false, time: '19:00' },
};

// The age limits depend on the current year, so they are checked when parsing.
const birthYear = z
  .number()
  .int()
  .refine((year) => {
    const age = new Date().getFullYear() - year;
    return age >= PROFILE_LIMITS.age.min && age <= PROFILE_LIMITS.age.max;
  }, `Age must be between ${PROFILE_LIMITS.age.min} and ${PROFILE_LIMITS.age.max}`);

function range({ min, max }: { min: number; max: number }) {
  return z.number().min(min).max(max);
}

const profileFields = {
  sex: z.enum(['male', 'female']),
  birthYear,
  heightCm: range(PROFILE_LIMITS.heightCm).int(),
  activityLevel: z.literal([1, 2, 3, 4, 5]),
  goalRateKgMonth: z.literal(GOAL_RATES_KG_PER_MONTH),
  proteinGPerKg: range(PROFILE_LIMITS.proteinGPerKg),
  fatGPerKg: range(PROFILE_LIMITS.fatGPerKg),
  trainingBonusKcal: range(PROFILE_LIMITS.trainingBonusKcal).int(),
  trainingDays: z.number().int().min(0).max(ALL_DAYS_MASK),
  waterGoalMl: range(PROFILE_LIMITS.waterGoalMl).int(),
  reminders: remindersSchema,
};

export const profileSchema = z.object({ ...profileFields, updatedAt: z.iso.datetime() });

export type Profile = z.infer<typeof profileSchema>;

/** Fields the onboarding must give before a profile exists; the others have defaults. */
export const PROFILE_REQUIRED_FIELDS = [
  'sex',
  'birthYear',
  'heightCm',
  'activityLevel',
  'goalRateKgMonth',
] as const satisfies readonly (keyof Profile)[];

export const PROFILE_FIELD_DEFAULTS = {
  proteinGPerKg: PROFILE_DEFAULTS.proteinGPerKg,
  fatGPerKg: PROFILE_DEFAULTS.fatGPerKg,
  trainingBonusKcal: PROFILE_DEFAULTS.trainingBonusKcal,
  trainingDays: 0,
  waterGoalMl: PROFILE_DEFAULTS.waterGoalMl,
  reminders: DEFAULT_REMINDERS,
} as const satisfies Partial<Profile>;

/** Partial update (PATCH /v1/me): unknown fields are rejected, reminders are replaced whole. */
export const profileUpdateSchema = z
  .strictObject(profileFields)
  .partial()
  .refine((update) => Object.keys(update).length > 0, 'Nothing to update');

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** Response of GET and PATCH /v1/me: the account and its profile, null before onboarding. */
export const meSchema = z.object({
  user: z.object({ id: z.uuid(), email: z.email() }),
  profile: profileSchema.nullable(),
});

export type Me = z.infer<typeof meSchema>;
