import { describe, expect, it } from 'vitest';

import { dayTarget } from './day-target';
import { trainingDaysMask } from './training-days';

// Target of the onboarding mockup; training on Monday, Wednesday and Friday.
const week = { maintenanceKcal: 2650, targetKcal: 2900, proteinG: 150, carbsG: 381, fatG: 86 };
const profile = { trainingBonusKcal: 150, trainingDays: trainingDaysMask([0, 2, 4]) };

describe('dayTarget', () => {
  it('is the weekly target on a rest day', () => {
    // Tuesday 3 November 2026.
    expect(dayTarget(week, profile, new Date(2026, 10, 3))).toEqual({
      kcal: 2900,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
      surplusKcal: 250,
      trainingDay: false,
    });
  });

  it('adds the training bonus to the carbohydrates on a training day', () => {
    // Monday 2 November 2026: +150 kcal = +37 g of carbohydrates (rounded down).
    expect(dayTarget(week, profile, new Date(2026, 10, 2))).toEqual({
      kcal: 3050,
      proteinG: 150,
      carbsG: 418,
      fatG: 86,
      surplusKcal: 400,
      trainingDay: true,
    });
  });

  it('adds nothing when the bonus is turned off', () => {
    expect(dayTarget(week, { ...profile, trainingBonusKcal: 0 }, new Date(2026, 10, 2)).kcal).toBe(
      2900,
    );
  });
});
