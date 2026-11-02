// Columns shared by the tables of the device (spec section 4). `server_seq` stays on the server.
import { integer, text } from 'drizzle-orm/sqlite-core';

/** Instant in milliseconds since the epoch (SQLite has no date type). */
export function instant(name: string) {
  return integer(name, { mode: 'timestamp_ms' });
}

/** Local day "YYYY-MM-DD". */
export function day(name: string) {
  return text(name);
}

function lifecycle() {
  return {
    createdAt: instant('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    /** Time of the last change on the device, used for last-write-wins. */
    updatedAt: instant('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: instant('deleted_at'),
  };
}

/** Synchronised table: UUID v7 generated on the device (see `newId`), owned by the user. */
export function syncColumns() {
  return { id: text('id').primaryKey(), userId: text('user_id').notNull(), ...lifecycle() };
}

/** Food catalogue: global foods cached on the device have no owner. */
export function catalogueColumns() {
  return { id: text('id').primaryKey(), ownerId: text('owner_id'), ...lifecycle() };
}
