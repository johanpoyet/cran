import { type Food, FOOD_SEARCH_LIMITS, foodSearchResultSchema } from '@cran/shared';
import { useEffect, useMemo, useState } from 'react';

import type { LocalDatabase } from '../db/types';
import { ApiError, apiFetch } from '../lib/api';
import { searchLocalFoods } from './local-search';

/** Pause after the last key before asking the server. */
export const SEARCH_DEBOUNCE_MS = 250;
const LIMIT = FOOD_SEARCH_LIMITS.defaultLimit;

/** "loading": waiting for the server; "offline": only the foods of the phone are shown. */
export type SearchStatus = 'loading' | 'done' | 'offline';

interface RemoteResult {
  query: string;
  foods: Food[];
  status: SearchStatus;
}

/**
 * Foods matching the query: those of the phone at once (the user's first), then the server's
 * (CIQUAL, Open Food Facts) once it answers, without duplicates.
 */
export function useFoodSearch(
  db: LocalDatabase,
  userId: string,
  query: string,
): { foods: Food[]; status: SearchStatus } {
  const trimmed = query.trim();
  const local = useMemo(
    () => (trimmed ? searchLocalFoods(db, userId, trimmed, LIMIT) : []),
    [db, userId, trimmed],
  );
  const [remote, setRemote] = useState<RemoteResult | null>(null);

  useEffect(() => {
    if (!trimmed) return;
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed, limit: String(LIMIT) });
      apiFetch(`/v1/foods/search?${params.toString()}`, foodSearchResultSchema).then(
        ({ foods }) => {
          if (active) setRemote({ query: trimmed, foods, status: 'done' });
        },
        (error: unknown) => {
          // Unreachable server or error answer: the local results stay alone.
          if (active) {
            setRemote({
              query: trimmed,
              foods: [],
              status: error instanceof ApiError ? 'done' : 'offline',
            });
          }
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return useMemo(() => {
    const current = remote?.query === trimmed ? remote : null;
    const seen = new Set(local.map((food) => food.id));
    const fromServer = (current?.foods ?? []).filter((food) => !seen.has(food.id));
    return { foods: [...local, ...fromServer], status: current?.status ?? 'loading' };
  }, [local, remote, trimmed]);
}
