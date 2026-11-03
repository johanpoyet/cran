// A sync server in memory, following the protocol of docs/SPEC.md section 5 closely enough to test
// the engine of the app: last write wins on updatedAt, a cursor over a global write sequence.
import type { Food, SyncPullResult, SyncPushResult } from '@cran/shared';

interface Stored {
  table: string;
  row: Record<string, unknown> & { id: string; updatedAt: string };
  seq: number;
}

/** `catalogue`: the global foods the server knows (CIQUAL, Open Food Facts). */
export function createFakeSyncServer(catalogue: readonly Food[] = []) {
  const rows = new Map<string, Stored>();
  const foods = new Map(catalogue.map((food) => [food.id, food]));
  /** Ids asked to GET /v1/foods/:id, in order. */
  const foodRequests: string[] = [];
  let seq = 0;

  function push(changes: { table: string; row: Stored['row'] }[]): SyncPushResult {
    const result: SyncPushResult = { accepted: [], rejected: [] };
    for (const { table, row } of changes) {
      const key = `${table}/${row.id}`;
      const current = rows.get(key);
      if (current && Date.parse(current.row.updatedAt) > Date.parse(row.updatedAt)) {
        result.rejected.push({ id: row.id, reason: 'stale' });
        continue;
      }
      if (current?.row.updatedAt !== row.updatedAt) {
        seq += 1;
        rows.set(key, { table, row, seq });
      }
      result.accepted.push(row.id);
    }
    return result;
  }

  function pull(cursor: number, limit: number): SyncPullResult {
    const after = [...rows.values()]
      .filter((stored) => stored.seq > cursor)
      .sort((a, b) => a.seq - b.seq);
    const page = after.slice(0, limit);
    return {
      changes: page.map(({ table, row }) => ({
        table: table as SyncPullResult['changes'][number]['table'],
        row,
      })),
      cursor: page.at(-1)?.seq ?? cursor,
      hasMore: after.length > limit,
    };
  }

  /** Answers the app's fetch calls to /v1/sync/push, /v1/sync/pull and /v1/foods/:id. */
  function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === '/v1/sync/push') {
      const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as {
        changes: { table: string; row: Stored['row'] }[];
      };
      return Promise.resolve(Response.json(push(body.changes)));
    }
    if (url.pathname === '/v1/sync/pull') {
      const cursor = Number(url.searchParams.get('cursor') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 500);
      return Promise.resolve(Response.json(pull(cursor, limit)));
    }
    const food = /^\/v1\/foods\/([^/]+)$/.exec(url.pathname);
    if (food?.[1]) {
      foodRequests.push(food[1]);
      const found = foods.get(food[1]);
      return Promise.resolve(
        found
          ? Response.json({ food: found, portions: [] })
          : Response.json(
              { error: { code: 'not_found', message: 'Food not found' } },
              { status: 404 },
            ),
      );
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  }

  return { rows, foodRequests, push, pull, fetch };
}
