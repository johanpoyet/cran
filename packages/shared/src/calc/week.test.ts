import { describe, expect, it } from 'vitest';

import { isDateKey, localDateKey, weekStart } from './week';

describe('localDateKey', () => {
  it('uses the local calendar day, zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('weekStart', () => {
  it.each([
    ['2026-10-26', '2026-10-26'], // Monday
    ['2026-10-31', '2026-10-26'], // Saturday
    ['2026-11-01', '2026-10-26'], // Sunday
    ['2027-01-01', '2026-12-28'], // across a year
  ])('%s → %s', (day, monday) => {
    expect(weekStart(day)).toBe(monday);
  });

  it.each(['2026-02-30', '2026-1-5', 'hier'])('rejects %s', (key) => {
    expect(() => weekStart(key)).toThrow(RangeError);
    expect(isDateKey(key)).toBe(false);
  });

  it('accepts real days', () => {
    expect(isDateKey('2028-02-29')).toBe(true);
  });
});
