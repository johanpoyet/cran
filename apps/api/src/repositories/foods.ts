import type { Food, FoodDetail } from '@cran/shared';
import { and, asc, desc, eq, isNull, or, type SQL, sql } from 'drizzle-orm';

import type { AppDatabase } from '../db/client';
import { foodPortions, type FoodRow, foods, unaccented } from '../db/schema';

/** Words that say nothing about the food ("flocons d'avoine", "pâtes au beurre"). */
const STOP_WORDS = new Set([
  'a',
  'au',
  'aux',
  'avec',
  'd',
  'de',
  'des',
  'du',
  'en',
  'et',
  'l',
  'la',
  'le',
  'les',
  'ou',
  'sans',
  'un',
  'une',
]);
const MAX_WORDS = 6;
/**
 * Strict word similarity (trigrams of whole words, not of any stretch of the name) and a threshold
 * below the default 0.5 of pg_trgm, to forgive one wrong letter ("poulat" → "poulet").
 */
const WORD_SIMILARITY_THRESHOLD = 0.4;

/** Search words: lower case, split on anything but letters and digits, without stop words. */
export function searchWords(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
  return [...new Set(words)].slice(0, MAX_WORDS);
}

/** Every query is scoped to the session's user: only their own foods besides the catalogue. */
export function createFoodRepository(db: AppDatabase) {
  /**
   * Foods whose name or brand contains every word of the query, accents ignored, a slight typo
   * forgiven. The user's foods come first, then CIQUAL, then the Open Food Facts cache; within a
   * group, the closest names first, a name starting with the first word first, then the shortest.
   */
  async function search(userId: string, query: string, limit: number): Promise<Food[]> {
    const words = searchWords(query);
    const [firstWord] = words;
    if (firstWord === undefined) return [];

    const name = unaccented(foods.name);
    const brand = unaccented(foods.brand);
    const matches: SQL[] = [];
    const scores: SQL[] = [];
    for (const word of words) {
      const plain = sql`f_unaccent(${word})`;
      const contains = sql`'%' || ${plain} || '%'`;
      matches.push(
        sql`(${name} ilike ${contains} or ${plain} <<% ${name}
          or ${brand} ilike ${contains} or ${plain} <<% ${brand})`,
      );
      scores.push(
        sql`greatest(strict_word_similarity(${plain}, ${name}),
          0.8 * coalesce(strict_word_similarity(${plain}, ${brand}), 0))`,
      );
    }
    const score = sql.join(scores, sql` + `);
    const startsWithFirstWord = sql`(${name} ilike f_unaccent(${firstWord}) || '%')`;
    const group = sql`case ${foods.source} when 'user' then 0 when 'ciqual' then 1 else 2 end`;

    return db.transaction(async (tx) => {
      await tx.execute(
        sql.raw(
          `set local pg_trgm.strict_word_similarity_threshold = ${String(WORD_SIMILARITY_THRESHOLD)}`,
        ),
      );
      const rows = await tx
        .select()
        .from(foods)
        .where(
          and(
            isNull(foods.deletedAt),
            or(isNull(foods.ownerId), eq(foods.ownerId, userId)),
            ...matches,
          ),
        )
        .orderBy(
          asc(group),
          desc(startsWithFirstWord),
          desc(score),
          asc(sql`length(${foods.name})`),
          asc(foods.name),
        )
        .limit(limit);
      return rows.map(toFood);
    });
  }

  /**
   * A food of the catalogue or of the user, with its portions; null for another user's food or an
   * unknown id. A global food removed from CIQUAL is still returned: entries may use it.
   */
  async function find(userId: string, id: string): Promise<FoodDetail | null> {
    const [row] = await db
      .select()
      .from(foods)
      .where(and(eq(foods.id, id), or(isNull(foods.ownerId), eq(foods.ownerId, userId))))
      .limit(1);
    if (!row) return null;
    const portions = await db
      .select({ label: foodPortions.label, grams: foodPortions.grams })
      .from(foodPortions)
      .where(
        and(
          eq(foodPortions.foodId, id),
          isNull(foodPortions.deletedAt),
          or(isNull(foodPortions.ownerId), eq(foodPortions.ownerId, userId)),
        ),
      )
      .orderBy(asc(foodPortions.grams));
    return { food: toFood(row), portions };
  }

  return { search, find };
}

export type FoodRepository = ReturnType<typeof createFoodRepository>;

export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.sourceRef,
    name: row.name,
    brand: row.brand,
    kcal100g: row.kcal100g,
    protein100g: row.protein100g,
    carbs100g: row.carbs100g,
    fat100g: row.fat100g,
    fiber100g: row.fiber100g,
    salt100g: row.salt100g,
    defaultPortionG: row.defaultPortionG,
    qualityFlag: row.qualityFlag,
  };
}
