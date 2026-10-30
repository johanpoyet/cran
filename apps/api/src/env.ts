import { z } from 'zod';

// Empty strings (unset values in Dokploy or .env) count as absent for optional settings.
const optional = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_VERSION: z.string().min(1).default('dev'),
  /** Public URL of the API, used by Better Auth for callbacks. */
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  /** Signs session cookies and tokens: at least 32 random characters (openssl rand -base64 32). */
  BETTER_AUTH_SECRET: z.string().min(32),
  /** Sign in with Apple: Services ID, client secret (JWT) and the iOS bundle id for native id tokens. */
  APPLE_CLIENT_ID: optional,
  APPLE_CLIENT_SECRET: optional,
  APPLE_APP_BUNDLE_IDENTIFIER: z.string().default('fr.johanpoyet.cran'),
  /** Google: comma-separated OAuth client ids (web, iOS, Android) and the web client secret. */
  GOOGLE_CLIENT_IDS: optional,
  GOOGLE_CLIENT_SECRET: optional,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
