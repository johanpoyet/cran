import { describe, expect, it } from 'vitest';

import { formatGrams, formatInteger, formatKcal, formatKg } from './number';

// Normalise every kind of space so assertions read like the spec ("2 900 kcal").
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ');

describe('formatInteger', () => {
  it('groups thousands the French way', () => {
    expect(plain(formatInteger(2900))).toBe('2 900');
    expect(plain(formatInteger(12345))).toBe('12 345');
  });

  it('rounds to the nearest integer for display', () => {
    expect(formatInteger(149.6)).toBe('150');
  });
});

describe('formatKcal', () => {
  it('formats energy with a non-breaking unit', () => {
    expect(plain(formatKcal(2900))).toBe('2 900 kcal');
    expect(formatKcal(760)).toBe('760\u00a0kcal');
  });
});

describe('formatGrams', () => {
  it('formats grams as an integer', () => {
    expect(plain(formatGrams(381.4))).toBe('381 g');
  });
});

describe('formatKg', () => {
  it('uses a decimal comma and one decimal', () => {
    expect(plain(formatKg(68.4))).toBe('68,4 kg');
    expect(plain(formatKg(70))).toBe('70,0 kg');
    expect(plain(formatKg(66.66))).toBe('66,7 kg');
  });
});
