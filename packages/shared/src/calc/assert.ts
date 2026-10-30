/** Guards against NaN, Infinity and out-of-range inputs, which would silently corrupt a target. */
export function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${String(value)}`);
  }
}
