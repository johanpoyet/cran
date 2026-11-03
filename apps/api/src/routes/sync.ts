import {
  syncPullQuerySchema,
  syncPullResultSchema,
  syncPushResultSchema,
  syncPushSchema,
} from '@cran/shared';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';

import { ErrorSchema } from '../errors';
import type { SessionVariables } from '../middleware/session';
import type { SyncRepository } from '../repositories/sync';

const errorContent = { 'application/json': { schema: ErrorSchema } };

const push = createRoute({
  method: 'post',
  path: '/sync/push',
  tags: ['Sync'],
  summary: 'Push local changes',
  description:
    'Up to 500 changed rows of the phone, each applied in last-write-wins on `updatedAt` or rejected with a reason. Pushing the same batch again changes nothing.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: syncPushSchema.meta({ id: 'SyncPush' }) } },
    },
  },
  responses: {
    200: {
      description: 'Ids accepted, and ids rejected with their reason',
      content: {
        'application/json': { schema: syncPushResultSchema.meta({ id: 'SyncPushResult' }) },
      },
    },
    400: { description: 'Not a batch of changes, or more than 500', content: errorContent },
    401: { description: 'No valid session', content: errorContent },
  },
});

const pull = createRoute({
  method: 'get',
  path: '/sync/pull',
  tags: ['Sync'],
  summary: 'Pull changes since a cursor',
  description:
    "The user's rows written after the cursor, in write order across tables, by pages of up to 500. Deletions come as rows with `deletedAt`.",
  request: { query: syncPullQuerySchema.meta({ id: 'SyncPullQuery' }) },
  responses: {
    200: {
      description: 'A page of changes and the next cursor',
      content: {
        'application/json': { schema: syncPullResultSchema.meta({ id: 'SyncPullResult' }) },
      },
    },
    400: { description: 'Invalid cursor or limit', content: errorContent },
    401: { description: 'No valid session', content: errorContent },
  },
});

export function syncRoutes(sync: SyncRepository) {
  return new OpenAPIHono<{ Variables: SessionVariables }>()
    .openapi(push, async (c) => c.json(await sync.push(c.get('user').id, c.req.valid('json')), 200))
    .openapi(pull, async (c) => {
      const { cursor, limit } = c.req.valid('query');
      return c.json(await sync.pull(c.get('user').id, cursor, limit), 200);
    });
}
