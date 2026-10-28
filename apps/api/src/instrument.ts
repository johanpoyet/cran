// Loaded with `node --import` before the app so Sentry can instrument Node modules.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    ...(process.env.APP_VERSION ? { release: process.env.APP_VERSION } : {}),
    // GDPR: meals, weights and measurements are health data. Sentry 11 replaced
    // `sendDefaultPii` with `dataCollection`, whose defaults collect almost everything.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ['content-type', 'user-agent', 'x-request-id'] },
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
  });
}
