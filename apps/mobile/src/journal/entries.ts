import type { MealType } from '@cran/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { notifyLocalChange } from '../db/changes';
import * as schema from '../db/schema';
import type { LocalDatabase } from '../db/types';

export type Entry = typeof schema.logEntries.$inferSelect;

function own(userId: string, id: string) {
  return and(
    eq(schema.logEntries.id, id),
    eq(schema.logEntries.userId, userId),
    isNull(schema.logEntries.deletedAt),
  );
}

/** Entries of one meal of a local day, in the order they were logged. */
export function readMealEntries(
  db: LocalDatabase,
  userId: string,
  date: string,
  mealType: MealType,
): Entry[] {
  return db
    .select()
    .from(schema.logEntries)
    .where(
      and(
        eq(schema.logEntries.userId, userId),
        eq(schema.logEntries.date, date),
        eq(schema.logEntries.mealType, mealType),
        isNull(schema.logEntries.deletedAt),
      ),
    )
    .orderBy(asc(schema.logEntries.loggedAt))
    .all();
}

export function readEntry(db: LocalDatabase, userId: string, id: string): Entry | null {
  return db.select().from(schema.logEntries).where(own(userId, id)).get() ?? null;
}

type Values = Pick<Entry, 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>;

function scaled(entry: Values, ratio: number): Values {
  return {
    kcal: entry.kcal * ratio,
    proteinG: entry.proteinG * ratio,
    carbsG: entry.carbsG * ratio,
    fatG: entry.fatG * ratio,
  };
}

/**
 * Values of an entry for another quantity, scaled from the values copied when it was logged (the
 * food may have changed since, or no longer exist).
 */
export function scaleEntry(entry: Values & Pick<Entry, 'grams'>, grams: number): Values {
  return scaled(entry, entry.grams ? grams / entry.grams : 1);
}

/** Values of a recipe entry for another number of servings, as `scaleEntry`. */
export function scaleEntryServings(
  entry: Values & Pick<Entry, 'servings'>,
  servings: number,
): Values {
  return scaled(entry, entry.servings ? servings / entry.servings : 1);
}

/** New quantity and values of an entry, or nothing if the change does not apply to it. */
function quantityChange(entry: Entry, changes: { grams?: number; servings?: number }) {
  // Servings of a recipe: the weight of the portion follows, when it is known.
  if (changes.servings !== undefined && entry.servings !== null) {
    const ratio = changes.servings / entry.servings;
    return {
      servings: changes.servings,
      ...(entry.grams === null ? {} : { grams: entry.grams * ratio }),
      ...scaled(entry, ratio),
    };
  }
  if (changes.grams !== undefined && entry.grams !== null && entry.servings === null) {
    return { grams: changes.grams, ...scaleEntry(entry, changes.grams) };
  }
  return {};
}

/**
 * Changes the quantity of an entry (its values follow): grams, or servings for a recipe logged in
 * servings. It may also move the entry to another meal of the same day. Returns false if the entry
 * is not the user's or is deleted.
 */
export function updateEntry(
  db: LocalDatabase,
  userId: string,
  id: string,
  changes: { grams?: number; servings?: number; mealType?: MealType },
): boolean {
  const entry = readEntry(db, userId, id);
  if (!entry) return false;
  const quantity = quantityChange(entry, changes);
  db.update(schema.logEntries)
    .set({
      ...quantity,
      ...(changes.mealType ? { mealType: changes.mealType } : {}),
      updatedAt: new Date(),
    })
    .where(own(userId, id))
    .run();
  notifyLocalChange();
  return true;
}

/** Removes an entry from the journal (soft delete, so that the sync can propagate it). */
export function deleteEntry(db: LocalDatabase, userId: string, id: string): boolean {
  const now = new Date();
  const deleted = db
    .update(schema.logEntries)
    .set({ deletedAt: now, updatedAt: now })
    .where(own(userId, id))
    .returning({ id: schema.logEntries.id })
    .all();
  notifyLocalChange();
  return deleted.length > 0;
}
