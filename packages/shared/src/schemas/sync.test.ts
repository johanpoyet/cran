import { describe, expect, it } from 'vitest';

import { isSyncTable, SYNC_TABLES, syncPullQuerySchema, syncRowSchemas } from './sync';

describe('sync tables', () => {
  it('apply every table with a row schema, each once', () => {
    expect([...SYNC_TABLES].sort()).toEqual(Object.keys(syncRowSchemas).sort());
  });

  it('recognises the synchronised tables only', () => {
    expect(isSyncTable('log_entries')).toBe(true);
    expect(isSyncTable('progress_photos')).toBe(false);
    expect(isSyncTable('toString')).toBe(false);
  });
});

describe('syncPullQuerySchema', () => {
  it('starts from the beginning, by pages of 500', () => {
    expect(syncPullQuerySchema.parse({})).toEqual({ cursor: 0, limit: 500 });
    expect(syncPullQuerySchema.parse({ cursor: '42', limit: '10' })).toEqual({
      cursor: 42,
      limit: 10,
    });
  });
});
