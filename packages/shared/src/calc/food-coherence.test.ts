import { describe, expect, it } from 'vitest';

import { foodCoherence } from './food-coherence';

// Example of the "Nouvel aliment" mockup and acceptance criteria of S2-5.
const galette = { protein: 6, carbs: 30, fat: 2 };

describe('foodCoherence', () => {
  it('accepts 162 kcal for P 6 · G 30 · L 2 (4 × 6 + 4 × 30 + 9 × 2 = 162)', () => {
    expect(foodCoherence({ kcal: 162, ...galette })).toEqual({ computedKcal: 162, coherent: true });
  });

  it('warns for 300 kcal with the same macros', () => {
    expect(foodCoherence({ kcal: 300, ...galette })).toEqual({
      computedKcal: 162,
      coherent: false,
    });
  });

  it('tolerates 15 kcal on small values, strictly', () => {
    // 4 × 1 + 4 × 10 = 44 kcal; 10 % stays under 15 kcal.
    const values = { protein: 1, carbs: 10, fat: 0 };
    expect(foodCoherence({ kcal: 58, ...values }).coherent).toBe(true);
    expect(foodCoherence({ kcal: 59, ...values }).coherent).toBe(false);
    expect(foodCoherence({ kcal: 29.5, ...values }).coherent).toBe(true);
    expect(foodCoherence({ kcal: 29, ...values }).coherent).toBe(false);
  });

  it('tolerates 10 % of the calories on large values', () => {
    // 4 × 10 + 4 × 50 + 9 × 30 = 510; 10 % of 560 = 56.
    const values = { protein: 10, carbs: 50, fat: 30 };
    expect(foodCoherence({ kcal: 560, ...values }).coherent).toBe(true);
    expect(foodCoherence({ kcal: 570, ...values }).coherent).toBe(false);
  });

  it('handles a food without energy', () => {
    expect(foodCoherence({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toEqual({
      computedKcal: 0,
      coherent: true,
    });
  });
});
