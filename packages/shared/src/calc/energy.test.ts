import { describe, expect, it } from 'vitest';

import {
  ageFromBirthYear,
  basalMetabolicRate,
  type BodyProfile,
  dailySurplusKcal,
  dailyTargetKcal,
  initialMaintenanceKcal,
} from './energy';

// Profile of the "Ta cible" mockup: man born in 2005, 180 cm, 68.4 kg, moderately active.
const johan: BodyProfile = { sex: 'male', ageYears: 21, heightCm: 180, weightKg: 68.4 };

describe('ageFromBirthYear', () => {
  it('counts years reached in the current calendar year', () => {
    expect(ageFromBirthYear(2005, new Date(2026, 9, 30))).toBe(21);
    expect(ageFromBirthYear(2005, new Date(2026, 0, 1))).toBe(21);
  });

  it('rejects a birth year in the future or this year', () => {
    expect(() => ageFromBirthYear(2026, new Date(2026, 5, 1))).toThrow(RangeError);
    expect(() => ageFromBirthYear(2030, new Date(2026, 5, 1))).toThrow(RangeError);
  });
});

describe('basalMetabolicRate (Mifflin-St Jeor)', () => {
  it('adds 5 for a man', () => {
    // 10 × 68.4 + 6.25 × 180 − 5 × 21 + 5
    expect(basalMetabolicRate(johan)).toBeCloseTo(1709, 10);
  });

  it('subtracts 161 for a woman', () => {
    // 10 × 60 + 6.25 × 165 − 5 × 30 − 161
    expect(
      basalMetabolicRate({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60 }),
    ).toBeCloseTo(1320.25, 10);
  });

  it.each([
    ['weightKg', { ...johan, weightKg: 0 }],
    ['heightCm', { ...johan, heightCm: -1 }],
    ['ageYears', { ...johan, ageYears: Number.NaN }],
  ])('rejects an invalid %s', (_, profile) => {
    expect(() => basalMetabolicRate(profile)).toThrow(RangeError);
  });
});

describe('initialMaintenanceKcal', () => {
  it('gives the 2 650 kcal of the mockup for a moderately active profile', () => {
    // 1 709 × 1.55 = 2 648.95 → 2 650
    expect(initialMaintenanceKcal(johan, 3)).toBe(2650);
  });

  it.each([
    [1, 2050], // 1 709 × 1.2 = 2 050.8
    [2, 2350], // × 1.375 = 2 349.9
    [3, 2650],
    [4, 2950], // × 1.725 = 2 948.0
    [5, 3250], // × 1.9 = 3 247.1
  ] as const)('applies the factor of activity level %i', (level, expected) => {
    expect(initialMaintenanceKcal(johan, level)).toBe(expected);
  });
});

describe('dailySurplusKcal', () => {
  it.each([
    [0.5, 130],
    [1, 250],
    [1.5, 380],
  ] as const)('%p kg/month → +%i kcal/day', (rate, expected) => {
    expect(dailySurplusKcal(rate)).toBe(expected);
  });
});

describe('dailyTargetKcal', () => {
  const base = { maintenanceKcal: 2650, surplusKcal: 250, trainingBonusKcal: 150 };

  it('is maintenance + surplus on a rest day', () => {
    expect(dailyTargetKcal({ ...base, isTrainingDay: false })).toBe(2900);
  });

  it('adds the training bonus on a training day', () => {
    expect(dailyTargetKcal({ ...base, isTrainingDay: true })).toBe(3050);
  });

  it('rejects a missing maintenance', () => {
    expect(() => dailyTargetKcal({ ...base, maintenanceKcal: 0, isTrainingDay: false })).toThrow(
      RangeError,
    );
  });
});
