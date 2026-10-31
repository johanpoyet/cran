import { DEFAULT_REMINDERS, PROFILE_DEFAULTS, type Reminders } from '@cran/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { syncColumns } from './sync';

export const sexEnum = pgEnum('sex', ['male', 'female']);

// One row per user: profile and settings (spec section 4).
export const profiles = pgTable(
  'profiles',
  {
    ...syncColumns(),
    sex: sexEnum('sex').notNull(),
    birthYear: smallint('birth_year').notNull(),
    heightCm: smallint('height_cm').notNull(),
    activityLevel: smallint('activity_level').notNull(),
    goalRateKgMonth: numeric('goal_rate_kg_month', {
      precision: 2,
      scale: 1,
      mode: 'number',
    }).notNull(),
    proteinGPerKg: numeric('protein_g_per_kg', { precision: 3, scale: 2, mode: 'number' })
      .notNull()
      .default(PROFILE_DEFAULTS.proteinGPerKg),
    fatGPerKg: numeric('fat_g_per_kg', { precision: 3, scale: 2, mode: 'number' })
      .notNull()
      .default(PROFILE_DEFAULTS.fatGPerKg),
    trainingBonusKcal: smallint('training_bonus_kcal')
      .notNull()
      .default(PROFILE_DEFAULTS.trainingBonusKcal),
    /** 7-bit mask, Monday = bit 0. */
    trainingDays: smallint('training_days').notNull().default(0),
    waterGoalMl: integer('water_goal_ml').notNull().default(PROFILE_DEFAULTS.waterGoalMl),
    reminders: jsonb('reminders').$type<Reminders>().notNull().default(DEFAULT_REMINDERS),
  },
  (table) => [
    uniqueIndex('profiles_user_id_idx').on(table.userId),
    index('profiles_server_seq_idx').on(table.serverSeq),
    check('profiles_activity_level_check', sql`${table.activityLevel} between 1 and 5`),
    check('profiles_goal_rate_check', sql`${table.goalRateKgMonth} in (0.5, 1, 1.5)`),
    check('profiles_training_days_check', sql`${table.trainingDays} between 0 and 127`),
  ],
);

export type ProfileRow = typeof profiles.$inferSelect;
