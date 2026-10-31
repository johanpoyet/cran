import { z } from 'zod';

/** Target of one week (table `weekly_targets`): from the formula at first, then adaptive. */
export const weeklyTargetSchema = z.object({
  /** Monday of the week, "YYYY-MM-DD". */
  weekStart: z.iso.date(),
  maintenanceKcal: z.number().int(),
  /** Rest-day target; the training bonus of the profile is added on training days. */
  targetKcal: z.number().int(),
  proteinG: z.number().int(),
  carbsG: z.number().int(),
  fatG: z.number().int(),
  method: z.enum(['formula', 'adaptive']),
  status: z.enum(['on_track', 'too_fast', 'too_slow', 'insufficient_data']),
});

export type WeeklyTarget = z.infer<typeof weeklyTargetSchema>;
