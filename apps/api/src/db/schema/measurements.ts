import { date, index, numeric, pgTable } from 'drizzle-orm/pg-core';

import { syncColumns } from './sync';

function centimetres(name: string) {
  return numeric(name, { precision: 5, scale: 2, mode: 'number' });
}

// Body measurements (spec section 4), all optional; their screen arrives in S7.
export const measurements = pgTable(
  'measurements',
  {
    ...syncColumns(),
    date: date('date', { mode: 'string' }).notNull(),
    armCm: centimetres('arm_cm'),
    chestCm: centimetres('chest_cm'),
    waistCm: centimetres('waist_cm'),
    thighCm: centimetres('thigh_cm'),
  },
  (table) => [
    index('measurements_user_date_idx').on(table.userId, table.date),
    index('measurements_server_seq_idx').on(table.serverSeq),
  ],
);
