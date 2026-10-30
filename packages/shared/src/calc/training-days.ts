// training_days is a 7-bit mask, Monday = bit 0 … Sunday = bit 6.

export const ALL_TRAINING_DAYS_MASK = 0b1111111;

/** Monday-based weekday index (Monday 0 … Sunday 6) of a local date. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function isTrainingDay(mask: number, date: Date): boolean {
  return (mask & (1 << mondayIndex(date))) !== 0;
}

/** Builds a mask from Monday-based weekday indexes. */
export function trainingDaysMask(days: readonly number[]): number {
  return days.reduce((mask, day) => {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new RangeError(`weekday index must be 0–6, got ${String(day)}`);
    }
    return mask | (1 << day);
  }, 0);
}

export function trainingDaysCount(mask: number): number {
  let count = 0;
  for (let day = 0; day < 7; day += 1) if (mask & (1 << day)) count += 1;
  return count;
}
