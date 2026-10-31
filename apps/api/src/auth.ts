import { expo } from '@better-auth/expo';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import type { AppDatabase } from './db/client';
import * as schema from './db/schema';
import type { Env } from './env';
import type { Logger } from './logger';

const DAY = 60 * 60 * 24;

export type AuthEnv = Pick<
  Env,
  'BETTER_AUTH_URL' | 'BETTER_AUTH_SECRET' | 'APPLE_APP_BUNDLE_IDENTIFIER' | 'GOOGLE_CLIENT_IDS'
>;

export interface AuthDeps {
  db: AppDatabase;
  env: AuthEnv;
  logger: Logger;
  /** Better Auth only rate-limits in production by default; tests switch it on explicitly. */
  rateLimit?: boolean;
}

// The app signs in natively (Sign in with Apple, Google Sign-In) and sends the provider's id token:
// Better Auth only checks its signature and audience, so no client secret is needed. Google is
// enabled once its client ids exist.
export function socialProviders(env: AuthEnv): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {
    apple: {
      clientId: env.APPLE_APP_BUNDLE_IDENTIFIER,
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
    },
  };
  if (env.GOOGLE_CLIENT_IDS) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_IDS.split(',').map((id) => id.trim()),
    };
  }
  return providers;
}

export function createAuth({ db, env, logger, rateLimit }: AuthDeps) {
  return betterAuth({
    appName: 'Cran',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      // No email provider yet: verification and password reset come before release.
      requireEmailVerification: false,
    },
    socialProviders: socialProviders(env),
    user: {
      additionalFields: {
        // Set by POST /v1/onboarding; the app reads it from the cached session, even offline.
        onboardedAt: { type: 'date', required: false, input: false },
      },
    },
    session: {
      // Mobile app: stay signed in for 30 days, extended at most once a day while in use.
      expiresIn: 30 * DAY,
      updateAge: DAY,
    },
    // The app's deep-link scheme, sent by the Expo client as its origin.
    trustedOrigins: ['cran://'],
    plugins: [expo()],
    rateLimit: {
      ...(rateLimit === undefined ? {} : { enabled: rateLimit }),
      storage: 'memory',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/sign-in/social': { window: 60, max: 10 },
      },
    },
    advanced: {
      database: { generateId: 'uuid' },
      // nginx sets X-Real-IP to the client address; X-Forwarded-For's first entry can be forged.
      ipAddress: { ipAddressHeaders: ['x-real-ip'] },
    },
    // Better Auth messages go to the JSON logs. Extra arguments are dropped: they may hold emails.
    logger: {
      log: (level, message) => {
        logger[level]({ source: 'better-auth' }, message);
      },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
