import { describe, expect, it } from 'vitest';

import { FOOD_SEARCH_LIMITS, foodSearchQuerySchema } from './food';

describe('foodSearchQuerySchema', () => {
  it('trims the query and applies the default limit', () => {
    expect(foodSearchQuerySchema.parse({ q: '  riz ' })).toEqual({
      q: 'riz',
      limit: FOOD_SEARCH_LIMITS.defaultLimit,
    });
  });

  it('reads the limit from the query string', () => {
    expect(foodSearchQuerySchema.parse({ q: 'riz', limit: '5' }).limit).toBe(5);
  });

  it.each([
    ['an empty query', { q: '   ' }],
    ['a query that is too long', { q: 'a'.repeat(FOOD_SEARCH_LIMITS.queryMax + 1) }],
    ['a limit of 0', { q: 'riz', limit: '0' }],
    ['a limit above the maximum', { q: 'riz', limit: String(FOOD_SEARCH_LIMITS.maxLimit + 1) }],
    ['a decimal limit', { q: 'riz', limit: '2.5' }],
  ])('rejects %s', (_, query) => {
    expect(foodSearchQuerySchema.safeParse(query).success).toBe(false);
  });
});
