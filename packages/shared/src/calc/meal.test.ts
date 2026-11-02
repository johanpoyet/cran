import { describe, expect, it } from 'vitest';

import { mealForTime } from './meal';

const at = (hours: number, minutes = 0) => new Date(2026, 10, 2, hours, minutes);

describe('mealForTime', () => {
  it.each([
    [at(4), 'breakfast'],
    [at(8, 10), 'breakfast'],
    [at(10, 29), 'breakfast'],
    [at(10, 30), 'lunch'],
    [at(14, 59), 'lunch'],
    [at(15), 'snack'],
    [at(18, 29), 'snack'],
    [at(18, 30), 'dinner'],
    [at(23, 50), 'dinner'],
    [at(1), 'dinner'],
  ])('at %s picks %s', (date, meal) => {
    expect(mealForTime(date)).toBe(meal);
  });
});
