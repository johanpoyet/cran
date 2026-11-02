import { renderHook, waitFor } from '@testing-library/react-native';

import { createRawDatabase } from '../test/local-database';
import * as schema from './schema';
import type { LocalDatabase } from './types';
import { useLocalDatabase } from './use-local-database';

const userId = '0192f0c0-0000-7000-8000-00000000a11c';

describe('useLocalDatabase', () => {
  it('is ready once migrated when signed out', async () => {
    const db = await createRawDatabase();
    const { result } = await renderHook(() => useLocalDatabase(db, null));

    await waitFor(() => {
      expect(result.current).toBe('ready');
    });
  });

  it('gives the database to the signed-in user before being ready', async () => {
    const db = await createRawDatabase();
    const { result } = await renderHook(() => useLocalDatabase(db, userId));

    await waitFor(() => {
      expect(result.current).toBe('ready');
    });
    expect(db.select().from(schema.localMeta).all()).toEqual([
      { key: 'owner_user_id', value: userId },
    ]);
  });

  it('reports a database that cannot be migrated', async () => {
    const broken = {} as LocalDatabase;
    const { result } = await renderHook(() => useLocalDatabase(broken, userId));

    await waitFor(() => {
      expect(result.current).toBe('error');
    });
  });
});
