import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

// Staging for EAS builds (eas.json), a local API in development.
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// The Expo plugin keeps the session cookie and the last session in SecureStore (Keychain), sends
// the cookie with every request and restores the cached session at launch, even offline.
export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [expoClient({ scheme: 'cran', storagePrefix: 'cran', storage: SecureStore })],
});
