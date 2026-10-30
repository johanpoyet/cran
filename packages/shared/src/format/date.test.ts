import { describe, expect, it } from 'vitest';

import { formatDayLabel } from './date';

describe('formatDayLabel', () => {
  it('formats a capitalised weekday, day and month', () => {
    expect(formatDayLabel(new Date(2026, 9, 27))).toBe('Mardi 27 octobre');
    expect(formatDayLabel(new Date(2026, 0, 1))).toBe('Jeudi 1 janvier');
  });

  it('uses the local date, not UTC', () => {
    expect(formatDayLabel(new Date(2026, 9, 30, 23, 59))).toBe('Vendredi 30 octobre');
  });
});
