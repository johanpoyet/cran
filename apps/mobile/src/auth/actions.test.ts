import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

import { authClient } from '../test/fake-auth-client';
import type * as defaultActions from './actions';
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from './actions';

jest.mock('./client', () => jest.requireActual<object>('../test/fake-auth-client'));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: () => 'raw-nonce',
  digestStringAsync: (_algorithm: string, value: string) => Promise.resolve(`sha256(${value})`),
}));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(() => Promise.resolve(null)),
  },
  isCancelledResponse: (response: { type: string }) => response.type === 'cancelled',
  statusCodes: { IN_PROGRESS: 'IN_PROGRESS' },
}));

function codedError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

const appleSignIn = jest.mocked(AppleAuthentication.signInAsync);
const googleSignIn = jest.mocked(GoogleSignin.signIn);

beforeEach(() => {
  jest.clearAllMocks();
  authClient.signIn.email.mockResolvedValue({ data: {}, error: null });
  authClient.signUp.email.mockResolvedValue({ data: {}, error: null });
  authClient.signIn.social.mockResolvedValue({ data: {}, error: null });
});

describe('email', () => {
  it('signs in', async () => {
    await expect(signInWithEmail('johan@example.com', 'secret123')).resolves.toEqual({
      status: 'success',
    });
    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: 'johan@example.com',
      password: 'secret123',
    });
  });

  it('signs up without asking for a name', async () => {
    await signUpWithEmail('johan@example.com', 'secret123');
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      email: 'johan@example.com',
      password: 'secret123',
      name: '',
    });
  });

  it('translates API errors', async () => {
    authClient.signIn.email.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 },
    });
    await expect(signInWithEmail('johan@example.com', 'wrong')).resolves.toEqual({
      status: 'error',
      error: 'auth.errors.invalidCredentials',
    });
  });

  it('reports an unreachable server', async () => {
    authClient.signUp.email.mockRejectedValue(new TypeError('Network request failed'));
    await expect(signUpWithEmail('johan@example.com', 'secret123')).resolves.toEqual({
      status: 'error',
      error: 'auth.errors.network',
    });
  });
});

describe('Apple', () => {
  it('sends the id token, the raw nonce and the name to the API', async () => {
    appleSignIn.mockResolvedValue({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Johan', familyName: 'Poyet' },
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(signInWithApple()).resolves.toEqual({ status: 'success' });
    expect(appleSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 'sha256(raw-nonce)' }),
    );
    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: 'apple',
      idToken: {
        token: 'apple-id-token',
        nonce: 'raw-nonce',
        user: { name: { firstName: 'Johan', lastName: 'Poyet' } },
      },
    });
  });

  it('does nothing when the user cancels', async () => {
    appleSignIn.mockRejectedValue(codedError('ERR_REQUEST_CANCELED'));
    await expect(signInWithApple()).resolves.toEqual({ status: 'cancelled' });
    expect(authClient.signIn.social).not.toHaveBeenCalled();
  });

  it('fails without an id token', async () => {
    appleSignIn.mockResolvedValue({
      identityToken: null,
      fullName: null,
    } as AppleAuthentication.AppleAuthenticationCredential);
    await expect(signInWithApple()).resolves.toEqual({
      status: 'error',
      error: 'auth.errors.providerFailed',
    });
  });
});

describe('Google', () => {
  it('is not offered without client ids', async () => {
    await expect(signInWithGoogle()).resolves.toEqual({
      status: 'error',
      error: 'auth.errors.providerFailed',
    });
    expect(googleSignIn).not.toHaveBeenCalled();
  });

  describe('once configured', () => {
    let actions: typeof defaultActions;

    beforeEach(() => {
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios.apps.googleusercontent.com';
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
      jest.isolateModules(() => {
        actions = jest.requireActual<typeof defaultActions>('./actions');
      });
    });

    afterEach(() => {
      delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    });

    it('sends the Google id token to the API', async () => {
      googleSignIn.mockResolvedValue({
        type: 'success',
        data: { idToken: 'google-id-token' },
      } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);

      expect(actions.googleSignInAvailable).toBe(true);
      await expect(actions.signInWithGoogle()).resolves.toEqual({ status: 'success' });
      expect(GoogleSignin.configure).toHaveBeenCalledWith({
        iosClientId: 'ios.apps.googleusercontent.com',
        webClientId: 'web.apps.googleusercontent.com',
      });
      expect(authClient.signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        idToken: { token: 'google-id-token' },
      });
    });

    it('does nothing when the user cancels', async () => {
      googleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
      await expect(actions.signInWithGoogle()).resolves.toEqual({ status: 'cancelled' });
      expect(authClient.signIn.social).not.toHaveBeenCalled();
    });

    it('forgets the Google account on sign-out', async () => {
      googleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
      await actions.signInWithGoogle();
      await actions.signOut();
      expect(GoogleSignin.signOut).toHaveBeenCalled();
    });
  });
});

describe('signOut', () => {
  it('never throws, even offline', async () => {
    authClient.signOut.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(signOut()).resolves.toBeUndefined();
  });
});
