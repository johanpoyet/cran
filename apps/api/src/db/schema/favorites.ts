import { sql } from 'drizzle-orm';
import { check, index, pgTable, uuid } from 'drizzle-orm/pg-core';

import { foods } from './foods';
import { recipes } from './recipes';
import { syncColumns } from './sync';

// Favourite foods and recipes (spec section 4), one of the two per row.
export const favorites = pgTable(
  'favorites',
  {
    ...syncColumns(),
    foodId: uuid('food_id').references(() => foods.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('favorites_user_id_idx').on(table.userId),
    index('favorites_server_seq_idx').on(table.serverSeq),
    check('favorites_target_check', sql`num_nonnulls(${table.foodId}, ${table.recipeId}) = 1`),
  ],
);

export type FavoriteRow = typeof favorites.$inferSelect;
