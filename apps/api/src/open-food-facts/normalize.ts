import { foodCoherence } from '@cran/shared';

/** The product fields Cran reads (spec section 5), as Open Food Facts sends them. */
export interface OffProduct {
  product_name_fr?: unknown;
  product_name?: unknown;
  brands?: unknown;
  serving_quantity?: unknown;
  nutriments?: Record<string, unknown>;
}

/** Fields requested from Open Food Facts, to keep the answer small. */
export const OFF_FIELDS = [
  'product_name_fr',
  'product_name',
  'brands',
  'serving_quantity',
  'nutriments',
] as const;

/** A product ready for the `foods` table (source `off`). */
export interface OffFood {
  sourceRef: string;
  name: string;
  brand: string | null;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number | null;
  salt100g: number | null;
  defaultPortionG: number | null;
  qualityFlag: 'ok' | 'incoherent' | 'incomplete';
}

const KJ_PER_KCAL = 4.184;
/** Largest value of a numeric(6,2) column. */
const MAX_VALUE = 9999.99;
const NAME_MAX = 200;

/** A number from Open Food Facts, sent as a number or a string; null when absent or out of range. */
function amount(raw: unknown): number | null {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_VALUE) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function text(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? null : trimmed.slice(0, NAME_MAX);
}

/**
 * Normalises a product for Cran: French name first, first brand, energy in kcal (converted from kJ
 * when only kJ is given). Missing proteins, carbohydrates or fat are stored as 0 and the product is
 * marked incomplete; calories far from the macros mark it incoherent. Null without a name or
 * energy: the app then offers to create the food.
 */
export function toOffFood(ean: string, product: OffProduct): OffFood | null {
  const name = text(product.product_name_fr) ?? text(product.product_name);
  const nutriments = product.nutriments ?? {};
  const kj = amount(nutriments['energy-kj_100g']);
  const kcal =
    amount(nutriments['energy-kcal_100g']) ??
    (kj === null ? null : Math.round((kj / KJ_PER_KCAL) * 100) / 100);
  if (name === null || kcal === null) return null;

  const protein = amount(nutriments.proteins_100g);
  const carbs = amount(nutriments.carbohydrates_100g);
  const fat = amount(nutriments.fat_100g);
  const values = { kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 };
  const qualityFlag =
    protein === null || carbs === null || fat === null
      ? 'incomplete'
      : foodCoherence(values).coherent
        ? 'ok'
        : 'incoherent';
  const portion = amount(product.serving_quantity);

  return {
    sourceRef: ean,
    name,
    brand: typeof product.brands === 'string' ? text(product.brands.split(',')[0]) : null,
    kcal100g: kcal,
    protein100g: values.protein,
    carbs100g: values.carbs,
    fat100g: values.fat,
    fiber100g: amount(nutriments.fiber_100g),
    salt100g: amount(nutriments.salt_100g),
    defaultPortionG: portion === 0 ? null : portion,
    qualityFlag,
  };
}
