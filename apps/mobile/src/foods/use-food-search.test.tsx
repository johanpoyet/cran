import { act, renderHook } from '@testing-library/react-native';

import type { LocalDatabase } from '../db/types';
import { mockFetchFailure, mockFetchResponse } from '../test/fetch';
import { basmati, complet } from '../test/foods';
import { searchLocalFoods } from './local-search';
import { SEARCH_DEBOUNCE_MS, useFoodSearch } from './use-food-search';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));
jest.mock('./local-search', () => ({ searchLocalFoods: jest.fn(() => []) }));

const db = {} as LocalDatabase;
const userId = '0192f0c0-0000-7000-8000-00000000a11c';

beforeEach(() => {
  jest.useFakeTimers();
  jest.restoreAllMocks();
  jest.mocked(searchLocalFoods).mockReturnValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

async function waitForServer() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useFoodSearch', () => {
  it('shows the foods of the phone at once, then adds the server ones without duplicates', async () => {
    jest.mocked(searchLocalFoods).mockReturnValue([basmati]);
    const fetchMock = mockFetchResponse(200, { foods: [basmati, complet] });

    const { result } = await renderHook(() => useFoodSearch(db, userId, ' riz '));
    expect(result.current).toEqual({ foods: [basmati], status: 'loading' });
    expect(fetchMock).not.toHaveBeenCalled();

    await waitForServer();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/v1/foods/search?q=riz&limit=20',
      expect.anything(),
    );
    expect(result.current).toEqual({ foods: [basmati, complet], status: 'done' });
  });

  it('asks the server once the typing stops', async () => {
    const fetchMock = mockFetchResponse(200, { foods: [] });
    const { rerender } = await renderHook(
      ({ query }: { query: string }) => useFoodSearch(db, userId, query),
      {
        initialProps: { query: 'r' },
      },
    );
    await rerender({ query: 'ri' });
    await rerender({ query: 'riz' });

    await waitForServer();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the local results when the server cannot be reached', async () => {
    jest.mocked(searchLocalFoods).mockReturnValue([basmati]);
    mockFetchFailure();

    const { result } = await renderHook(() => useFoodSearch(db, userId, 'riz'));
    await waitForServer();

    expect(result.current).toEqual({ foods: [basmati], status: 'offline' });
  });

  it('does nothing for an empty query', async () => {
    const fetchMock = mockFetchResponse(200, { foods: [] });
    const { result } = await renderHook(() => useFoodSearch(db, userId, '  '));
    await waitForServer();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.foods).toEqual([]);
  });
});
