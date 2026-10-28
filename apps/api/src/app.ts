import { OpenAPIHono, z } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import * as Sentry from '@sentry/node';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

import { errorBody } from './errors';
import type { Logger } from './logger';
import { healthRoutes } from './routes/health';

export const MAX_BODY_BYTES = 1024 * 1024;

export interface AppDeps {
  logger: Logger;
  version: string;
  pingDatabase: () => Promise<void>;
  databaseTimeoutMs?: number;
}

export function createApp({ logger, version, pingDatabase, databaseTimeoutMs }: AppDeps) {
  const app = new OpenAPIHono({
    // Zod validation failures share the common error shape.
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody('validation_error', 'Invalid request', z.treeifyError(result.error)),
          400,
        );
      }
      return undefined;
    },
  });

  app.use(requestId());
  app.use(secureHeaders());
  app.use(
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json(errorBody('payload_too_large', 'Request body is too large'), 413),
    }),
  );

  // Access log: method, path and status only. No query string or body (personal data).
  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    logger.info(
      {
        requestId: c.get('requestId'),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      },
      'request',
    );
  });

  app.route(
    '/',
    healthRoutes({ version, pingDatabase, ...(databaseTimeoutMs ? { databaseTimeoutMs } : {}) }),
  );

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Cran API',
      version,
      description: 'Backend of Cran, a calorie and macro tracker for lean bulking.',
    },
  });
  app.get('/docs', Scalar({ url: '/openapi.json', pageTitle: 'Cran API' }));

  app.notFound((c) => c.json(errorBody('not_found', 'Route not found'), 404));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json(errorBody('http_error', error.message), error.status);
    }
    Sentry.captureException(error);
    logger.error({ err: error, requestId: c.get('requestId') }, 'unhandled error');
    return c.json(errorBody('internal_error', 'Internal server error'), 500);
  });

  return app;
}
