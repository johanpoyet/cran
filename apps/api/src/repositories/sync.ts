import {
  isSyncTable,
  PULL_ONLY_TABLES,
  SYNC_MAX_CLOCK_SKEW_MS,
  SYNC_TABLES,
  type SyncPullResult,
  type SyncPush,
  type SyncPushResult,
  type SyncRejectReason,
  syncRowSchemas,
  type SyncTable,
} from '@cran/shared';
import { and, asc, eq, getTableColumns, gt, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

import type { AppDatabase } from '../db/client';
import * as schema from '../db/schema';

interface SyncedTable {
  table: PgTable;
  id: PgColumn;
  /** `user_id`, or `owner_id` for the food catalogue (only the user's own rows sync). */
  owner: PgColumn;
  ownerKey: 'userId' | 'ownerId';
  updatedAt: PgColumn;
  serverSeq: PgColumn;
}

function synced(
  table: PgTable & {
    id: PgColumn;
    updatedAt: PgColumn;
    serverSeq: PgColumn;
  } & ({ userId: PgColumn } | { ownerId: PgColumn }),
): SyncedTable {
  const ownerKey = 'userId' in table ? 'userId' : 'ownerId';
  return {
    table,
    id: table.id,
    owner: 'userId' in table ? table.userId : table.ownerId,
    ownerKey,
    updatedAt: table.updatedAt,
    serverSeq: table.serverSeq,
  };
}

const TABLES: Record<SyncTable, SyncedTable> = {
  profiles: synced(schema.profiles),
  weigh_ins: synced(schema.weighIns),
  weekly_targets: synced(schema.weeklyTargets),
  foods: synced(schema.foods),
  food_portions: synced(schema.foodPortions),
  recipes: synced(schema.recipes),
  recipe_ingredients: synced(schema.recipeIngredients),
  meal_templates: synced(schema.mealTemplates),
  meal_template_items: synced(schema.mealTemplateItems),
  favorites: synced(schema.favorites),
  log_entries: synced(schema.logEntries),
  water_logs: synced(schema.waterLogs),
  measurements: synced(schema.measurements),
};

type Values = Record<string, unknown>;

/** Columns stored as timestamps: ISO strings on the wire, dates in the database. */
function timestampKeys(table: PgTable): Set<string> {
  return new Set(
    Object.entries(getTableColumns(table))
      .filter(([, column]) => column.columnType === 'PgTimestamp')
      .map(([key]) => key),
  );
}

const TIMESTAMPS = Object.fromEntries(
  SYNC_TABLES.map((name) => [name, timestampKeys(TABLES[name].table)]),
) as Record<SyncTable, Set<string>>;

/** A database row as sent to the client: the keys of its schema, instants as ISO strings. */
function toWire(name: SyncTable, row: Values): Values {
  const keys = Object.keys(syncRowSchemas[name].shape);
  return Object.fromEntries(
    keys.map((key) => {
      const value = row[key];
      return [key, value instanceof Date ? value.toISOString() : value];
    }),
  );
}

/** A validated wire row as database values. */
function toValues(name: SyncTable, row: Values): Values {
  const timestamps = TIMESTAMPS[name];
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      timestamps.has(key) && typeof value === 'string' ? new Date(value) : value,
    ]),
  );
}

/** Postgres error code behind a failed query (postgres.js and PGlite wrap it differently). */
function pgCode(error: unknown): string | undefined {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

const REASON_BY_CODE: Record<string, SyncRejectReason> = {
  '23503': 'unknown_reference',
  '23505': 'conflict',
  '23514': 'invalid',
  '22003': 'invalid',
};

type Outcome = { accepted: true } | { accepted: false; reason: SyncRejectReason };

/**
 * Sync protocol of docs/SPEC.md section 5, scoped to the session's user: a row of another user is
 * never read nor written.
 */
export function createSyncRepository(db: AppDatabase, now: () => Date = () => new Date()) {
  async function apply(userId: string, name: SyncTable, input: Values): Promise<Outcome> {
    if (PULL_ONLY_TABLES.includes(name)) return { accepted: false, reason: 'read_only' };
    const parsed = syncRowSchemas[name].safeParse(input);
    if (!parsed.success) return { accepted: false, reason: 'invalid' };
    const row = parsed.data as Values & { id: string; updatedAt: string };
    const target = TABLES[name];

    if (row[target.ownerKey] !== userId) return { accepted: false, reason: 'forbidden' };
    // The client creates and edits its own foods only, never the global catalogue.
    if (name === 'foods' && row.source !== 'user') return { accepted: false, reason: 'forbidden' };
    const updatedAt = Date.parse(row.updatedAt);
    if (updatedAt > now().getTime() + SYNC_MAX_CLOCK_SKEW_MS) {
      return { accepted: false, reason: 'future_timestamp' };
    }

    const [existing] = (await db
      .select({ owner: target.owner, updatedAt: target.updatedAt })
      .from(target.table)
      .where(eq(target.id, row.id))
      .limit(1)) as { owner: string | null; updatedAt: Date }[];
    if (existing) {
      if (existing.owner !== userId) return { accepted: false, reason: 'forbidden' };
      const current = existing.updatedAt.getTime();
      // The same change pushed again is already applied; an older one loses (last write wins).
      if (current === updatedAt) return { accepted: true };
      if (current > updatedAt) return { accepted: false, reason: 'stale' };
    }

    const values = toValues(name, row);
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(target.table)
          .values(values)
          .onConflictDoUpdate({
            target: target.id,
            set: values,
            // Never take over another user's row, nor overwrite a newer one (concurrent pushes).
            setWhere: sql`${target.owner} = ${userId} and ${target.updatedAt} < ${row.updatedAt}::timestamptz`,
          });
      });
    } catch (error) {
      const reason = REASON_BY_CODE[pgCode(error) ?? ''];
      if (reason) return { accepted: false, reason };
      throw error;
    }
    return { accepted: true };
  }

  /** Applies a batch of changes, parents before children; each row is accepted or rejected alone. */
  async function push(userId: string, { changes }: SyncPush): Promise<SyncPushResult> {
    const order = (table: string) =>
      isSyncTable(table) ? SYNC_TABLES.indexOf(table) : SYNC_TABLES.length;
    const sorted = changes
      .map((change, index) => ({ ...change, index }))
      .sort((a, b) => order(a.table) - order(b.table) || a.index - b.index);

    const result: SyncPushResult = { accepted: [], rejected: [] };
    for (const { table, row } of sorted) {
      const id = typeof row.id === 'string' ? row.id : '';
      const outcome: Outcome = isSyncTable(table)
        ? await apply(userId, table, row)
        : { accepted: false, reason: 'unknown_table' };
      if (outcome.accepted) result.accepted.push(id);
      else result.rejected.push({ id, reason: outcome.reason });
    }
    return result;
  }

  /** The user's rows written after the cursor, in write order across tables, one page. */
  async function pull(userId: string, cursor: number, limit: number): Promise<SyncPullResult> {
    const pages = await Promise.all(
      SYNC_TABLES.map(async (name) => {
        const target = TABLES[name];
        const rows = (await db
          .select()
          .from(target.table)
          .where(and(eq(target.owner, userId), gt(target.serverSeq, cursor)))
          .orderBy(asc(target.serverSeq))
          .limit(limit + 1)) as (Values & { serverSeq: number })[];
        return rows.map((row) => ({ name, row }));
      }),
    );
    const all = pages.flat().sort((a, b) => a.row.serverSeq - b.row.serverSeq);
    const page = all.slice(0, limit);
    const last = page.at(-1);
    return {
      changes: page.map(({ name, row }) => ({ table: name, row: toWire(name, row) })),
      cursor: last ? last.row.serverSeq : cursor,
      hasMore: all.length > limit,
    };
  }

  return { push, pull };
}

export type SyncRepository = ReturnType<typeof createSyncRepository>;
