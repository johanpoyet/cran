import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';

import type { AppDatabase } from '../db/client';
import { foods, nextServerSeq } from '../db/schema';
import { type CiqualFood, readContents, readRecords, toFood } from './parse';

export interface CiqualFiles {
  /** Lines of `alim_*.xml`. */
  foods: AsyncIterable<string> | Iterable<string>;
  /** Lines of `compo_*.xml`. */
  contents: AsyncIterable<string> | Iterable<string>;
}

export interface CiqualImportResult {
  /** Foods read from the files. */
  imported: number;
  /** Foods inserted, changed or restored; 0 when the same version is imported again. */
  written: number;
  /** Codes left out because the table gives no energy. */
  skipped: string[];
  /** CIQUAL foods absent from this version, soft-deleted. */
  removed: number;
}

/** Below this, the files are surely truncated: refuse rather than delete the catalogue. */
export const MIN_CIQUAL_FOODS = 1000;
const BATCH_SIZE = 500;

/**
 * Imports a CIQUAL version into `foods` (source `ciqual`). Idempotent: upsert on the CIQUAL code,
 * so running it again, or with a newer version, creates no duplicate. Foods that disappeared from
 * the table are soft-deleted; journal entries keep their copied values.
 */
export async function importCiqual(
  db: AppDatabase,
  files: CiqualFiles,
): Promise<CiqualImportResult> {
  const contents = await readContents(files.contents);
  const rows: CiqualFood[] = [];
  const skipped: string[] = [];
  for await (const record of readRecords(files.foods, 'ALIM')) {
    const code = record.alim_code;
    const name = record.alim_nom_fr;
    if (!code || !name) continue;
    const food = toFood(code, name, contents.get(code) ?? {});
    if (food) rows.push(food);
    else skipped.push(code);
  }
  if (rows.length < MIN_CIQUAL_FOODS) {
    throw new Error(`Only ${String(rows.length)} CIQUAL foods read: incomplete files?`);
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    let written = 0;
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const batch = await tx
        .insert(foods)
        .values(
          rows
            .slice(start, start + BATCH_SIZE)
            .map((row) => ({ ...row, source: 'ciqual' as const })),
        )
        .onConflictDoUpdate({
          target: [foods.source, foods.sourceRef],
          set: {
            name: sql`excluded.name`,
            kcal100g: sql`excluded.kcal_100g`,
            protein100g: sql`excluded.protein_100g`,
            carbs100g: sql`excluded.carbs_100g`,
            fat100g: sql`excluded.fat_100g`,
            fiber100g: sql`excluded.fiber_100g`,
            salt100g: sql`excluded.salt_100g`,
            qualityFlag: sql`excluded.quality_flag`,
            deletedAt: null,
            updatedAt: now,
            serverSeq: nextServerSeq,
          },
          // Unchanged foods are left as they are: a new run writes nothing.
          setWhere: sql`(${foods.name}, ${foods.kcal100g}, ${foods.protein100g}, ${foods.carbs100g},
            ${foods.fat100g}, ${foods.fiber100g}, ${foods.salt100g}, ${foods.qualityFlag})
            is distinct from (excluded.name, excluded.kcal_100g, excluded.protein_100g,
            excluded.carbs_100g, excluded.fat_100g, excluded.fiber_100g, excluded.salt_100g,
            excluded.quality_flag) or ${foods.deletedAt} is not null`,
        })
        .returning({ id: foods.id });
      written += batch.length;
    }

    const removed = await tx
      .update(foods)
      .set({ deletedAt: now, updatedAt: now, serverSeq: nextServerSeq })
      .where(
        and(
          eq(foods.source, 'ciqual'),
          isNull(foods.deletedAt),
          notInArray(
            foods.sourceRef,
            rows.map((row) => row.sourceRef ?? ''),
          ),
        ),
      )
      .returning({ id: foods.id });

    return { imported: rows.length, written, skipped, removed: removed.length };
  });
}
