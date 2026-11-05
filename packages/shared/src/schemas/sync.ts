import { z } from 'zod';

import { MEAL_TYPES } from '../calc/meal';
import { isDateKey } from '../calc/week';
import { FOOD_QUALITY_FLAGS, FOOD_SOURCES } from './food';
import { WEIGHT_LIMITS_KG } from './onboarding';
import { profileFields } from './profile';

// Rows exchanged by the sync (docs/SPEC.md section 5): one schema per synchronised table, in the
// shape of the local database (camelCase), instants as ISO strings, days as "YYYY-MM-DD".

/** Most changes in one push, and rows in one pull page. */
export const SYNC_BATCH_MAX = 500;
/** A change dated further in the future than this is refused (clock of the device too far ahead). */
export const SYNC_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const instant = z.iso.datetime();
const day = z.string().refine(isDateKey, 'Expected a date as YYYY-MM-DD');
const amount = z.number().min(0).max(9999.99);
const grams = z.number().positive().max(9999.99);

const lifecycle = { createdAt: instant, updatedAt: instant, deletedAt: instant.nullable() };
/** Columns of every table owned by a user. */
const owned = { id: z.uuid(), userId: z.uuid(), ...lifecycle };
/** Columns of the food catalogue: only the user's own rows are synchronised. */
const catalogue = { id: z.uuid(), ownerId: z.uuid(), ...lifecycle };

export const syncRowSchemas = {
  profiles: z.strictObject({
    ...owned,
    ...profileFields,
    healthDataConsentAt: instant.nullable(),
  }),
  weigh_ins: z.strictObject({
    ...owned,
    date: day,
    measuredAt: instant,
    weightKg: z.number().min(WEIGHT_LIMITS_KG.min).max(WEIGHT_LIMITS_KG.max),
    source: z.enum(['manual', 'healthkit', 'health_connect']),
    externalId: z.string().nullable(),
  }),
  weekly_targets: z.strictObject({
    ...owned,
    weekStart: day,
    maintenanceKcal: z.number().int(),
    targetKcal: z.number().int(),
    proteinG: z.number().int(),
    carbsG: z.number().int(),
    fatG: z.number().int(),
    method: z.enum(['formula', 'adaptive']),
    status: z.enum(['on_track', 'too_fast', 'too_slow', 'insufficient_data']),
  }),
  foods: z.strictObject({
    ...catalogue,
    source: z.enum(FOOD_SOURCES),
    sourceRef: z.string().nullable(),
    name: z.string().trim().min(1).max(200),
    brand: z.string().max(200).nullable(),
    kcal100g: amount,
    protein100g: amount,
    carbs100g: amount,
    fat100g: amount,
    fiber100g: amount.nullable(),
    salt100g: amount.nullable(),
    defaultPortionG: grams.nullable(),
    offSyncedAt: instant.nullable(),
    qualityFlag: z.enum(FOOD_QUALITY_FLAGS),
  }),
  food_portions: z.strictObject({
    ...catalogue,
    foodId: z.uuid(),
    label: z.string().trim().min(1).max(100),
    grams,
  }),
  favorites: z.strictObject({
    ...owned,
    foodId: z.uuid().nullable(),
    recipeId: z.uuid().nullable(),
  }),
  log_entries: z.strictObject({
    ...owned,
    date: day,
    mealType: z.enum(MEAL_TYPES),
    foodId: z.uuid().nullable(),
    recipeId: z.uuid().nullable(),
    label: z.string().max(300),
    grams: grams.nullable(),
    portionLabel: z.string().max(100).nullable(),
    /** Servings of a recipe (S6-2, ADR 0006); absent from the apps released before it. */
    servings: z.number().positive().max(999.99).nullable().default(null),
    kcal: amount,
    proteinG: amount,
    carbsG: amount,
    fatG: amount,
    loggedAt: instant,
  }),
  water_logs: z.strictObject({
    ...owned,
    date: day,
    ml: z.number().int().positive().max(10_000),
  }),
  recipes: z.strictObject({
    ...owned,
    name: z.string().trim().min(1).max(200),
    category: z.string().max(100).nullable(),
    servings: z.number().positive().max(999.99),
    cookedWeightG: grams.nullable(),
    notes: z.string().max(5000).nullable(),
  }),
  recipe_ingredients: z.strictObject({
    ...owned,
    recipeId: z.uuid(),
    foodId: z.uuid(),
    grams,
    isRaw: z.boolean(),
    position: z.number().int().min(0).max(1000),
  }),
  meal_templates: z.strictObject({
    ...owned,
    name: z.string().trim().min(1).max(200),
    mealType: z.enum(MEAL_TYPES).nullable(),
  }),
  meal_template_items: z.strictObject({
    ...owned,
    templateId: z.uuid(),
    foodId: z.uuid().nullable(),
    recipeId: z.uuid().nullable(),
    grams,
    position: z.number().int().min(0).max(1000),
  }),
  measurements: z.strictObject({
    ...owned,
    date: day,
    armCm: z.number().positive().max(999.99).nullable(),
    chestCm: z.number().positive().max(999.99).nullable(),
    waistCm: z.number().positive().max(999.99).nullable(),
    thighCm: z.number().positive().max(999.99).nullable(),
  }),
};

export type SyncTable = keyof typeof syncRowSchemas;
export type SyncRow<T extends SyncTable = SyncTable> = z.infer<(typeof syncRowSchemas)[T]>;

/**
 * Synchronised tables, parents before children (a push applies them in this order). Progress
 * photos never leave the phone.
 */
export const SYNC_TABLES = [
  'profiles',
  'weigh_ins',
  'weekly_targets',
  'foods',
  'food_portions',
  'recipes',
  'recipe_ingredients',
  'meal_templates',
  'meal_template_items',
  'favorites',
  'log_entries',
  'water_logs',
  'measurements',
] as const satisfies readonly SyncTable[];

/** Written by the server only (the weekly target is computed there): never accepted in a push. */
export const PULL_ONLY_TABLES: readonly SyncTable[] = ['weekly_targets'];

export function isSyncTable(table: string): table is SyncTable {
  return Object.hasOwn(syncRowSchemas, table);
}

/** A change as pushed: each row is checked on its own, so an invalid one never blocks the batch. */
export const syncPushSchema = z.strictObject({
  changes: z
    .array(z.object({ table: z.string(), row: z.record(z.string(), z.unknown()) }))
    .max(SYNC_BATCH_MAX),
});

export type SyncPush = z.infer<typeof syncPushSchema>;

export const SYNC_REJECT_REASONS = [
  /** Not a synchronised table, or one the server alone writes. */
  'unknown_table',
  'read_only',
  /** The row does not match the schema of its table. */
  'invalid',
  /** The row belongs to another user, or a global food. */
  'forbidden',
  /** `updated_at` more than 5 minutes ahead of the server. */
  'future_timestamp',
  /** The server has a newer version (last write wins): the next pull brings it. */
  'stale',
  /** A referenced row (food, recipe…) does not exist on the server. */
  'unknown_reference',
  /** Breaks a uniqueness rule (a second profile, two targets for one week). */
  'conflict',
] as const;

export type SyncRejectReason = (typeof SYNC_REJECT_REASONS)[number];

export const syncPushResultSchema = z.object({
  /** Applied, or already applied (the same change pushed again). */
  accepted: z.array(z.uuid()),
  rejected: z.array(z.object({ id: z.string(), reason: z.enum(SYNC_REJECT_REASONS) })),
});

export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPullQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(SYNC_BATCH_MAX).default(SYNC_BATCH_MAX),
});

export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;

export const syncPulledChangeSchema = z.object({
  table: z.enum(SYNC_TABLES),
  row: z.record(z.string(), z.unknown()),
});

export const syncPullResultSchema = z.object({
  /** Rows written after the cursor, in write order; deletions are rows with `deletedAt`. */
  changes: z.array(syncPulledChangeSchema),
  /** Cursor to send next time (`server_seq` of the last row, or the same cursor). */
  cursor: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type SyncPullResult = z.infer<typeof syncPullResultSchema>;
