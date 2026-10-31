import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { authClient } from './client';
import { type AuthApiError, type AuthErrorKey, authErrorKey } from './errors';

export type AuthResult =
  { status: 'success' } | { status: 'cancelled' } | { status: 'error'; error: AuthErrorKey };

const cancelled: AuthResult = { status: 'cancelled' };
const providerFailed: AuthResult = { status: 'error', error: 'auth.errors.providerFailed' };

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

// The client resolves with { error } for HTTP errors and rejects when the server is unreachable.
async function run(request: () => Promise<{ error: AuthApiError | null }>): Promise<AuthResult> {
  try {
    const { error } = await request();
    return error ? { status: 'error', error: authErrorKey(error) } : { status: 'success' };
  } catch {
    return { status: 'error', error: 'auth.errors.network' };
  }
}

export function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  return run(() => authClient.signIn.email({ email, password }));
}

// The name is not asked for: Cran never displays it.
export function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  return run(() => authClient.signUp.email({ email, password, name: '' }));
}

/** Native Sign in with Apple; the API checks the id token against the bundle id. */
export async function signInWithApple(): Promise<AuthResult> {
  // Apple signs the SHA-256 of the nonce; the API compares it with the raw value.
  const nonce = Crypto.randomUUID();
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
    });
  } catch (error) {
    return hasCode(error, 'ERR_REQUEST_CANCELED') ? cancelled : providerFailed;
  }
  const token = credential.identityToken;
  if (!token) return providerFailed;
  // Apple only sends the name on the very first sign-in.
  const firstName = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;
  return run(() =>
    authClient.signIn.social({
      provider: 'apple',
      idToken: { token, nonce, user: { name: { firstName, lastName } } },
    }),
  );
}

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/** Google is offered once its OAuth client ids are set for the build (eas.json). */
export const googleSignInAvailable = Boolean(googleIosClientId && googleWebClientId);

let googleConfigured = false;

/** Native Google Sign-In; the id token is issued for the web client id, checked by the API. */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!googleIosClientId || !googleWebClientId) return providerFailed;
  if (!googleConfigured) {
    GoogleSignin.configure({ iosClientId: googleIosClientId, webClientId: googleWebClientId });
    googleConfigured = true;
  }
  let token: string | null;
  try {
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return cancelled;
    token = response.data.idToken;
  } catch (error) {
    return hasCode(error, statusCodes.IN_PROGRESS) ? cancelled : providerFailed;
  }
  if (!token) return providerFailed;
  const idToken = token;
  return run(() => authClient.signIn.social({ provider: 'google', idToken: { token: idToken } }));
}

/**
 * Forgets the session on the device first, so signing out also works offline; the API revokes
 * it when reachable. Google forgets the chosen account, to offer the account picker next time.
 */
export async function signOut(): Promise<void> {
  if (googleConfigured) await GoogleSignin.signOut().catch(() => undefined);
  await authClient.signOut().catch(() => undefined);
}
