/** Clamps a progress value to [0, 1]; NaN and negative values count as 0. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 1);
}
