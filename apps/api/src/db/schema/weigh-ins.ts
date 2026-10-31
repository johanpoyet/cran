import { date, index, numeric, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { syncColumns } from './sync';

export const weighInSourceEnum = pgEnum('weigh_in_source', [
  'manual',
  'healthkit',
  'health_connect',
]);

// Weigh-ins (spec section 4). Several per day are kept; the trend uses the first of the morning.
export const weighIns = pgTable(
  'weigh_ins',
  {
    ...syncColumns(),
    /** Local day of the weigh-in. */
    date: date('date', { mode: 'string' }).notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    source: weighInSourceEnum('source').notNull(),
    /** Identifier in Apple Health or Health Connect, to skip duplicates on import. */
    externalId: text('external_id'),
  },
  (table) => [
    index('weigh_ins_user_date_idx').on(table.userId, table.date),
    index('weigh_ins_server_seq_idx').on(table.serverSeq),
  ],
);
