import type fr from '../i18n/fr.json';

export type AuthErrorKey = `auth.errors.${keyof (typeof fr)['auth']['errors']}`;

/** Error returned by the Better Auth client: a Better Auth code and the HTTP status. */
export interface AuthApiError {
  code?: string | undefined;
  status: number;
}

const byCode: Partial<Record<string, AuthErrorKey>> = {
  INVALID_EMAIL_OR_PASSWORD: 'auth.errors.invalidCredentials',
  USER_ALREADY_EXISTS: 'auth.errors.emailTaken',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'auth.errors.emailTaken',
  INVALID_EMAIL: 'auth.errors.invalidEmail',
  PASSWORD_TOO_SHORT: 'auth.errors.passwordTooShort',
  PASSWORD_TOO_LONG: 'auth.errors.passwordTooLong',
};

export function authErrorKey(error: AuthApiError): AuthErrorKey {
  // Rate limiting (5 sign-ins, 3 sign-ups per minute) answers 429 without a code.
  if (error.status === 429) return 'auth.errors.tooManyAttempts';
  return (error.code ? byCode[error.code] : undefined) ?? 'auth.errors.unknown';
}
