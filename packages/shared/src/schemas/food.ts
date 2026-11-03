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

/** Bounds of a food entered by hand, per 100 g: pure fat is 900 kcal, a macro 100 g at most. */
export const NEW_FOOD_LIMITS = {
  nameMax: 100,
  brandMax: 100,
  kcalMax: 900,
  gramsMax: 100,
  portionLabelMax: 40,
  portionGramsMax: 5000,
  portionsMax: 20,
} as const;

const per100g = z.number().min(0).max(NEW_FOOD_LIMITS.gramsMax);

export const foodPortionInputSchema = z.object({
  /** "1 galette", "1 pot". */
  label: z.string().trim().min(1).max(NEW_FOOD_LIMITS.portionLabelMax),
  grams: z.number().positive().max(NEW_FOOD_LIMITS.portionGramsMax),
});

export type FoodPortionInput = z.infer<typeof foodPortionInputSchema>;

/** "Nouvel aliment" form: values per 100 g and named portions. */
export const newFoodSchema = z
  .object({
    name: z.string().trim().min(1).max(NEW_FOOD_LIMITS.nameMax),
    brand: z
      .string()
      .trim()
      .max(NEW_FOOD_LIMITS.brandMax)
      .transform((brand) => (brand === '' ? null : brand))
      .nullable(),
    kcal100g: z.number().min(0).max(NEW_FOOD_LIMITS.kcalMax),
    protein100g: per100g,
    carbs100g: per100g,
    fat100g: per100g,
    portions: z.array(foodPortionInputSchema).max(NEW_FOOD_LIMITS.portionsMax),
  })
  .refine((food) => food.protein100g + food.carbs100g + food.fat100g <= NEW_FOOD_LIMITS.gramsMax, {
    message: 'Proteins, carbohydrates and fat exceed 100 g',
    path: ['macros'],
  });

export type NewFood = z.infer<typeof newFoodSchema>;

/** Bounds of a quick add (calories without a food). */
export const QUICK_ENTRY_LIMITS = { labelMax: 100, kcalMax: 9999, gramsMax: 999 } as const;

const quickMacro = z.number().min(0).max(QUICK_ENTRY_LIMITS.gramsMax);

/** Quick add: calories, optional macros (0 when unknown), and a label. */
export const quickEntrySchema = z.object({
  label: z.string().trim().max(QUICK_ENTRY_LIMITS.labelMax),
  kcal: z.number().positive().max(QUICK_ENTRY_LIMITS.kcalMax),
  proteinG: quickMacro,
  carbsG: quickMacro,
  fatG: quickMacro,
});

export type QuickEntry = z.infer<typeof quickEntrySchema>;
