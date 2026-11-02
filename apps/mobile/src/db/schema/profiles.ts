import type { Reminders } from '@cran/shared';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { instant, syncColumns } from './columns';

export const profiles = sqliteTable(
  'profiles',
  {
    ...syncColumns(),
    sex: text('sex', { enum: ['male', 'female'] }).notNull(),
    birthYear: integer('birth_year').notNull(),
    heightCm: integer('height_cm').notNull(),
    activityLevel: integer('activity_level').notNull(),
    goalRateKgMonth: real('goal_rate_kg_month').notNull(),
    proteinGPerKg: real('protein_g_per_kg').notNull(),
    fatGPerKg: real('fat_g_per_kg').notNull(),
    trainingBonusKcal: integer('training_bonus_kcal').notNull(),
    /** 7-bit mask, Monday = bit 0. */
    trainingDays: integer('training_days').notNull(),
    waterGoalMl: integer('water_goal_ml').notNull(),
    reminders: text('reminders', { mode: 'json' }).$type<Reminders>().notNull(),
    healthDataConsentAt: instant('health_data_consent_at'),
  },
  (table) => [uniqueIndex('profiles_user_id_idx').on(table.userId)],
);
