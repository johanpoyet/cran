import { describe, expect, it } from 'vitest';

import {
  ALL_TRAINING_DAYS_MASK,
  isTrainingDay,
  mondayIndex,
  trainingDaysCount,
  trainingDaysMask,
} from './training-days';

// Week of Monday 26 October 2026.
const monday = new Date(2026, 9, 26);
const wednesday = new Date(2026, 9, 28);
const sunday = new Date(2026, 10, 1);

describe('mondayIndex', () => {
  it('starts the week on Monday', () => {
    expect(mondayIndex(monday)).toBe(0);
    expect(mondayIndex(wednesday)).toBe(2);
    expect(mondayIndex(sunday)).toBe(6);
  });
});

describe('training days mask', () => {
  // Mockup "Onboarding 5": Monday, Wednesday, Friday, Saturday → 4 sessions.
  const mask = trainingDaysMask([0, 2, 4, 5]);

  it('sets one bit per day, Monday = bit 0', () => {
    expect(mask).toBe(0b0110101);
    expect(trainingDaysCount(mask)).toBe(4);
  });

  it('tells whether a date is a training day', () => {
    expect(isTrainingDay(mask, monday)).toBe(true);
    expect(isTrainingDay(mask, wednesday)).toBe(true);
    expect(isTrainingDay(mask, sunday)).toBe(false);
  });

  it('handles empty and full weeks', () => {
    expect(trainingDaysMask([])).toBe(0);
    expect(trainingDaysCount(0)).toBe(0);
    expect(trainingDaysCount(ALL_TRAINING_DAYS_MASK)).toBe(7);
    expect(isTrainingDay(ALL_TRAINING_DAYS_MASK, sunday)).toBe(true);
  });

  it('ignores duplicated days', () => {
    expect(trainingDaysMask([1, 1, 3])).toBe(0b0001010);
  });

  it.each([-1, 7, 2.5])('rejects weekday index %p', (day) => {
    expect(() => trainingDaysMask([day])).toThrow(RangeError);
  });
});
