import { date, index, integer, pgEnum, pgTable, smallint, uniqueIndex } from 'drizzle-orm/pg-core';

import { syncColumns } from './sync';

export const targetMethodEnum = pgEnum('target_method', ['formula', 'adaptive']);
export const targetStatusEnum = pgEnum('target_status', [
  'on_track',
  'too_fast',
  'too_slow',
  'insufficient_data',
]);

// History of targets, one row per week (spec section 4).
export const weeklyTargets = pgTable(
  'weekly_targets',
  {
    ...syncColumns(),
    /** Monday of the week. */
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    maintenanceKcal: integer('maintenance_kcal').notNull(),
    targetKcal: integer('target_kcal').notNull(),
    proteinG: smallint('protein_g').notNull(),
    carbsG: smallint('carbs_g').notNull(),
    fatG: smallint('fat_g').notNull(),
    method: targetMethodEnum('method').notNull(),
    status: targetStatusEnum('status').notNull(),
  },
  (table) => [
    uniqueIndex('weekly_targets_user_week_idx').on(table.userId, table.weekStart),
    index('weekly_targets_server_seq_idx').on(table.serverSeq),
  ],
);
