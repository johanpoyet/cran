import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const HealthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    version: z.string(),
    uptimeSeconds: z.number().int(),
    database: z.object({
      status: z.enum(['up', 'down']),
      latencyMs: z.number().int().nullable(),
    }),
  })
  .openapi('Health');

const route = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'API and database status',
  description:
    'Public endpoint polled by Uptime Kuma. Returns 503 when the database is unreachable.',
  responses: {
    200: {
      description: 'API and database are up',
      content: { 'application/json': { schema: HealthSchema } },
    },
    503: {
      description: 'Database is unreachable',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export interface HealthDeps {
  version: string;
  pingDatabase: () => Promise<void>;
  /** Maximum time to wait for the database before reporting it down. */
  databaseTimeoutMs?: number;
}

const startedAt = Date.now();

async function checkDatabase(
  ping: () => Promise<void>,
  timeoutMs: number,
): Promise<{ status: 'up' | 'down'; latencyMs: number | null }> {
  const start = performance.now();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('database ping timed out'));
    }, timeoutMs);
  });
  try {
    await Promise.race([ping(), timeout]);
    return { status: 'up', latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { status: 'down', latencyMs: null };
  } finally {
    clearTimeout(timer);
  }
}

export function healthRoutes({ version, pingDatabase, databaseTimeoutMs = 2000 }: HealthDeps) {
  return new OpenAPIHono().openapi(route, async (c) => {
    const database = await checkDatabase(pingDatabase, databaseTimeoutMs);
    const up = database.status === 'up';
    const body = {
      status: up ? ('ok' as const) : ('degraded' as const),
      version,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      database,
    };
    return up ? c.json(body, 200) : c.json(body, 503);
  });
}
