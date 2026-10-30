import { describe, expect, it } from 'vitest';

import { macrosForTarget } from './macros';

describe('macrosForTarget', () => {
  it('matches the reference example of the spec: 68.4 kg, 2 900 kcal → 150 g P, 86 g F, 381 g C', () => {
    expect(
      macrosForTarget({ targetKcal: 2900, weightKg: 68.4, proteinGPerKg: 2.2, fatGPerKg: 1.25 }),
    ).toEqual({
      proteinG: 150,
      fatG: 86,
      carbsG: 381,
    });
  });

  it('uses 2.2 g/kg protein and 1.25 g/kg fat by default', () => {
    expect(macrosForTarget({ targetKcal: 2900, weightKg: 68.4 })).toEqual({
      proteinG: 150,
      fatG: 86,
      carbsG: 381,
    });
  });

  it('puts the training bonus entirely into carbs', () => {
    const rest = macrosForTarget({ targetKcal: 2900, weightKg: 68.4 });
    const training = macrosForTarget({ targetKcal: 3050, weightKg: 68.4 });
    expect(training.proteinG).toBe(rest.proteinG);
    expect(training.fatG).toBe(rest.fatG);
    expect(training.carbsG).toBe(419); // (3 050 − 600 − 774) / 4
  });

  it('never exceeds the target', () => {
    for (const targetKcal of [2000, 2501, 2902, 3333]) {
      const { proteinG, fatG, carbsG } = macrosForTarget({ targetKcal, weightKg: 75.3 });
      expect(4 * proteinG + 9 * fatG + 4 * carbsG).toBeLessThanOrEqual(targetKcal);
      expect(targetKcal - (4 * proteinG + 9 * fatG + 4 * carbsG)).toBeLessThan(4);
    }
  });

  it('honours custom ratios', () => {
    expect(
      macrosForTarget({ targetKcal: 2800, weightKg: 80, proteinGPerKg: 2, fatGPerKg: 1 }),
    ).toEqual({
      proteinG: 160,
      fatG: 80,
      carbsG: 360,
    });
  });

  it('rejects a target too low for the protein and fat settings', () => {
    expect(() => macrosForTarget({ targetKcal: 1000, weightKg: 68.4 })).toThrow(/too low/);
  });

  it.each([
    ['targetKcal', { targetKcal: 0, weightKg: 68.4 }],
    ['weightKg', { targetKcal: 2900, weightKg: -68.4 }],
    ['proteinGPerKg', { targetKcal: 2900, weightKg: 68.4, proteinGPerKg: 0 }],
    ['fatGPerKg', { targetKcal: 2900, weightKg: 68.4, fatGPerKg: Number.POSITIVE_INFINITY }],
  ])('rejects an invalid %s', (_, input) => {
    expect(() => macrosForTarget(input)).toThrow(RangeError);
  });
});
