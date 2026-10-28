// Shared French number formatting: "2 900 kcal", "68,4 kg".
// Intl uses a narrow no-break space (U+202F) as the thousands separator in fr-FR.

const LOCALE = 'fr-FR';

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const weightFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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
