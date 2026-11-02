import { describe, expect, it } from 'vitest';

import { formatDayLabel, formatTime } from './date';

describe('formatDayLabel', () => {
  it('formats a capitalised weekday, day and month', () => {
    expect(formatDayLabel(new Date(2026, 9, 27))).toBe('Mardi 27 octobre');
    expect(formatDayLabel(new Date(2026, 0, 1))).toBe('Jeudi 1 janvier');
  });

  it('uses the local date, not UTC', () => {
    expect(formatDayLabel(new Date(2026, 9, 30, 23, 59))).toBe('Vendredi 30 octobre');
  });
});

describe('formatTime', () => {
  it.each([
    [new Date(2026, 9, 27, 8, 10), '8h10'],
    [new Date(2026, 9, 27, 12, 45), '12h45'],
    [new Date(2026, 9, 27, 0, 5), '0h05'],
  ])('writes %s as %s', (date, expected) => {
    expect(formatTime(date)).toBe(expected);
  });
});
