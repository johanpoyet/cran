import { expo } from '@better-auth/expo';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import type { AppDatabase } from './db/client';
import * as schema from './db/schema';
import type { Env } from './env';

const DAY = 60 * 60 * 24;

export type AuthEnv = Pick<
  Env,
  | 'BETTER_AUTH_URL'
  | 'BETTER_AUTH_SECRET'
  | 'APPLE_CLIENT_ID'
  | 'APPLE_CLIENT_SECRET'
  | 'APPLE_APP_BUNDLE_IDENTIFIER'
  | 'GOOGLE_CLIENT_IDS'
  | 'GOOGLE_CLIENT_SECRET'
>;

export interface AuthDeps {
  db: AppDatabase;
  env: AuthEnv;
  /** Better Auth only rate-limits in production by default; tests switch it on explicitly. */
  rateLimit?: boolean;
}

// Social providers are only enabled once their credentials exist (Apple and Google consoles).
export function socialProviders(env: AuthEnv): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
      // Native Sign in with Apple id tokens are issued for the app bundle id.
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
    };
  }
  if (env.GOOGLE_CLIENT_IDS && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_IDS.split(',').map((id) => id.trim()),
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  return providers;
}

export function createAuth({ db, env, rateLimit }: AuthDeps) {
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
    session: {
      // Mobile app: stay signed in for 30 days, extended at most once a day while in use.
      expiresIn: 30 * DAY,
      updateAge: DAY,
    },
    // The app's deep-link scheme, plus Apple's form_post callback for the web flow.
    trustedOrigins: ['cran://', 'https://appleid.apple.com'],
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
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
