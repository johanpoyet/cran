// Shared French number formatting: "2 900 kcal", "68,4 kg".
// Intl uses a narrow no-break space (U+202F) as the thousands separator in fr-FR.

const LOCALE = 'fr-FR';

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const weightFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const decimalFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** At most one decimal, French separator: "2,7", "28", "0,4". */
export function formatDecimal(value: number): string {
  return decimalFormat.format(value);
}

export function formatInteger(value: number): string {
  return integerFormat.format(value);
}

export function formatKcal(kcal: number): string {
  return `${formatInteger(kcal)}\u00a0kcal`;
}

export function formatGrams(grams: number): string {
  return `${formatInteger(grams)}\u00a0g`;
}

export function formatKg(kg: number): string {
  return `${weightFormat.format(kg)}\u00a0kg`;
}

/**
 * Number typed on a French keyboard: "2,5" or "2.5", spaces allowed ("1 200"). Null when the text
 * is not a plain non-negative decimal number.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return null;
  return Number(normalized);
}
