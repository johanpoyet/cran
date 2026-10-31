import type { z } from 'zod';

import { apiUrl, authClient } from '../auth/client';

/** HTTP error from the Cran API, with the code of its common error shape. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(`API error ${String(status)}${code ? ` (${code})` : ''}`);
  }
}

interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Calls a /v1 route with the session cookie and validates the response with its shared schema.
 * Rejects with ApiError for an HTTP error, with a TypeError when the server is unreachable.
 */
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = 'GET', body }: ApiRequest = {},
): Promise<T> {
  const cookie = await authClient.getCookie();
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new ApiError(res.status, error?.error?.code);
  }
  return schema.parse(await res.json());
}
