// Columns shared by every synchronised table (spec section 4).
import { sql } from 'drizzle-orm';
import { bigint, pgSequence, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth';

/** One sequence for all synchronised tables: the sync cursor orders writes across tables. */
export const serverSeq = pgSequence('server_seq');

/** Next value of the sequence, to set on every write. */
export const nextServerSeq = sql`nextval('server_seq')`;

export function syncColumns() {
  return {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Client time of the last change, used for last-write-wins. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    serverSeq: bigint('server_seq', { mode: 'number' }).notNull().default(nextServerSeq),
  };
}
