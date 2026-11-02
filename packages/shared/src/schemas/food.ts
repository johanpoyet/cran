import { z } from 'zod';

export const FOOD_SOURCES = ['ciqual', 'off', 'user'] as const;
export const FOOD_QUALITY_FLAGS = ['ok', 'incoherent', 'incomplete'] as const;

/** A food of the catalogue, values per 100 g (table `foods`). */
export const foodSchema = z.object({
  id: z.uuid(),
  /** `user`: a food of the current user (other users' foods are never returned). */
  source: z.enum(FOOD_SOURCES),
  /** CIQUAL code or EAN; null for user foods. */
  sourceRef: z.string().nullable(),
  name: z.string(),
  brand: z.string().nullable(),
  kcal100g: z.number(),
  protein100g: z.number(),
  carbs100g: z.number(),
  fat100g: z.number(),
  fiber100g: z.number().nullable(),
  salt100g: z.number().nullable(),
  defaultPortionG: z.number().nullable(),
  /** `incomplete`: missing values stored as 0; `incoherent`: kcal far from 4P + 4C + 9F. */
  qualityFlag: z.enum(FOOD_QUALITY_FLAGS),
});

export type Food = z.infer<typeof foodSchema>;

export const FOOD_SEARCH_LIMITS = { queryMax: 100, defaultLimit: 20, maxLimit: 50 } as const;

/** Query string of `GET /v1/foods/search`. */
export const foodSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(FOOD_SEARCH_LIMITS.queryMax),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(FOOD_SEARCH_LIMITS.maxLimit)
    .default(FOOD_SEARCH_LIMITS.defaultLimit),
});

export type FoodSearchQuery = z.infer<typeof foodSearchQuerySchema>;

export const foodSearchResultSchema = z.object({ foods: z.array(foodSchema) });

export type FoodSearchResult = z.infer<typeof foodSearchResultSchema>;
