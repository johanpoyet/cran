/** Rounds energy to the nearest 10 kcal, as targets are shown. */
export function roundToTen(kcal: number): number {
  return Math.round(kcal / 10) * 10;
}
