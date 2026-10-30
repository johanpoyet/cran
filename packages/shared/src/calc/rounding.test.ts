import { describe, expect, it } from 'vitest';

import { roundToTen } from './rounding';

describe('roundToTen', () => {
  it.each([
    [2648.95, 2650],
    [126.64, 130],
    [253.29, 250],
    [2645, 2650],
    [2644.9, 2640],
    [0, 0],
  ])('%p → %p', (input, expected) => {
    expect(roundToTen(input)).toBe(expected);
  });
});
