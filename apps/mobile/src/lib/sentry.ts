import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Disabled when no DSN is configured (local development, tests).
export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    // GDPR: never send personal data (meals, weights, photos are health data).
    // Deprecated in @sentry/core for `dataCollection`, which the React Native SDK 8 does not
    // expose yet: this remains the only switch (false is also the default).
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export { Sentry };
