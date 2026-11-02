import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { day, instant, syncColumns } from './columns';

export const weighIns = sqliteTable(
  'weigh_ins',
  {
    ...syncColumns(),
    date: day('date').notNull(),
    measuredAt: instant('measured_at').notNull(),
    weightKg: real('weight_kg').notNull(),
    source: text('source', { enum: ['manual', 'healthkit', 'health_connect'] }).notNull(),
    externalId: text('external_id'),
  },
  (table) => [index('weigh_ins_user_date_idx').on(table.userId, table.date)],
);

export const measurements = sqliteTable(
  'measurements',
  {
    ...syncColumns(),
    date: day('date').notNull(),
    armCm: real('arm_cm'),
    chestCm: real('chest_cm'),
    waistCm: real('waist_cm'),
    thighCm: real('thigh_cm'),
  },
  (table) => [index('measurements_user_date_idx').on(table.userId, table.date)],
);

export const weeklyTargets = sqliteTable(
  'weekly_targets',
  {
    ...syncColumns(),
    /** Monday of the week. */
    weekStart: day('week_start').notNull(),
    maintenanceKcal: integer('maintenance_kcal').notNull(),
    targetKcal: integer('target_kcal').notNull(),
    proteinG: integer('protein_g').notNull(),
    carbsG: integer('carbs_g').notNull(),
    fatG: integer('fat_g').notNull(),
    method: text('method', { enum: ['formula', 'adaptive'] }).notNull(),
    status: text('status', {
      enum: ['on_track', 'too_fast', 'too_slow', 'insufficient_data'],
    }).notNull(),
  },
  (table) => [uniqueIndex('weekly_targets_user_week_idx').on(table.userId, table.weekStart)],
);

/** Device only, never synchronised: the photos stay in the app's private storage. */
export const progressPhotos = sqliteTable(
  'progress_photos',
  {
    ...syncColumns(),
    date: day('date').notNull(),
    pose: text('pose', { enum: ['front', 'side', 'back'] }).notNull(),
    localUri: text('local_uri').notNull(),
  },
  (table) => [index('progress_photos_user_date_idx').on(table.userId, table.date)],
);
