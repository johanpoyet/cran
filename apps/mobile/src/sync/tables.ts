import { syncRowSchemas, type SyncTable } from '@cran/shared';
import { getTableColumns } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import * as schema from '../db/schema';

/** Local table of each synchronised table (weekly targets come from the server only). */
export const LOCAL_TABLES: Record<
  SyncTable,
  SQLiteTable & { id: SQLiteColumn; updatedAt: SQLiteColumn }
> = {
  profiles: schema.profiles,
  weigh_ins: schema.weighIns,
  weekly_targets: schema.weeklyTargets,
  foods: schema.foods,
  food_portions: schema.foodPortions,
  recipes: schema.recipes,
  recipe_ingredients: schema.recipeIngredients,
  meal_templates: schema.mealTemplates,
  meal_template_items: schema.mealTemplateItems,
  favorites: schema.favorites,
  log_entries: schema.logEntries,
  water_logs: schema.waterLogs,
  measurements: schema.measurements,
};

type Values = Record<string, unknown>;

const timestampKeys = Object.fromEntries(
  Object.entries(LOCAL_TABLES).map(([name, table]) => [
    name,
    new Set(
      Object.entries(getTableColumns(table))
        .filter(([, column]) => column.columnType === 'SQLiteTimestamp')
        .map(([key]) => key),
    ),
  ]),
) as Record<SyncTable, Set<string>>;

/** A local row as pushed: the keys of its sync schema, instants as ISO strings. */
export function toWire(table: SyncTable, row: Values): Values {
  return Object.fromEntries(
    Object.keys(syncRowSchemas[table].shape).map((key) => {
      const value = row[key];
      return [key, value instanceof Date ? value.toISOString() : value];
    }),
  );
}

/** A pulled row as local values: instants back to dates. */
export function fromWire(table: SyncTable, row: Values): Values {
  const timestamps = timestampKeys[table];
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      timestamps.has(key) && typeof value === 'string' ? new Date(value) : value,
    ]),
  );
}
