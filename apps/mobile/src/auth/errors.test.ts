import { authErrorKey } from './errors';

describe('authErrorKey', () => {
  it.each([
    ['INVALID_EMAIL_OR_PASSWORD', 401, 'auth.errors.invalidCredentials'],
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 422, 'auth.errors.emailTaken'],
    ['USER_ALREADY_EXISTS', 422, 'auth.errors.emailTaken'],
    ['INVALID_EMAIL', 400, 'auth.errors.invalidEmail'],
    ['PASSWORD_TOO_SHORT', 400, 'auth.errors.passwordTooShort'],
    ['PASSWORD_TOO_LONG', 400, 'auth.errors.passwordTooLong'],
    ['SOMETHING_NEW', 400, 'auth.errors.unknown'],
  ])('maps %s to a French message', (code, status, key) => {
    expect(authErrorKey({ code, status })).toBe(key);
  });

  it('explains rate limiting, which has no code', () => {
    expect(authErrorKey({ status: 429 })).toBe('auth.errors.tooManyAttempts');
  });

  it('falls back to a generic message', () => {
    expect(authErrorKey({ status: 500 })).toBe('auth.errors.unknown');
  });
});
