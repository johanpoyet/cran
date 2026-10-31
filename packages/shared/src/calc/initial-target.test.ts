import { describe, expect, it } from 'vitest';

import { initialTarget } from './initial-target';

describe('initialTarget', () => {
  it('gives the target of the "Ta cible de départ" mockup', () => {
    // Man born in 2005, 180 cm, 68.4 kg, moderately active, +1 kg per month.
    expect(
      initialTarget({
        sex: 'male',
        birthYear: 2005,
        heightCm: 180,
        weightKg: 68.4,
        activityLevel: 3,
        goalRateKgMonth: 1,
        today: new Date(2026, 9, 31),
      }),
    ).toEqual({
      maintenanceKcal: 2650,
      surplusKcal: 250,
      targetKcal: 2900,
      proteinG: 150,
      fatG: 86,
      carbsG: 381,
    });
  });

  it('uses the protein and fat settings when given', () => {
    const target = initialTarget({
      sex: 'female',
      birthYear: 1996,
      heightCm: 165,
      weightKg: 58,
      activityLevel: 2,
      goalRateKgMonth: 0.5,
      proteinGPerKg: 2,
      fatGPerKg: 1,
      today: new Date(2026, 9, 31),
    });
    // BMR = 580 + 1031.25 - 150 - 161 = 1300.25; × 1.375 = 1787.8 → 1790; +130.
    expect(target).toMatchObject({ maintenanceKcal: 1790, surplusKcal: 130, targetKcal: 1920 });
    expect(target).toMatchObject({ proteinG: 116, fatG: 58 });
  });
});
