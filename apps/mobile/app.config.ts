import type { ConfigContext, ExpoConfig } from 'expo/config';

// Expo project @johanpoyet/cran, created by `eas init`. Not a secret.
const EAS_PROJECT_ID = '8bef77cd-d6f5-4647-a2b3-8074f397a69b';

// Google Sign-In on iOS returns to the app through the reversed iOS client id. The plugin is only
// added once the client ids are set (eas.json), so builds work before the Google console is ready.
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleSignIn: NonNullable<ExpoConfig['plugins']> = googleIosClientId
  ? [
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`,
        },
      ],
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Cran',
  slug: 'cran',
  owner: 'johanpoyet',
  scheme: 'cran',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'fr.johanpoyet.cran',
    supportsTablet: false,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'fr.johanpoyet.cran',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#3554F5',
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication',
    ...googleSignIn,
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 140,
        backgroundColor: '#3554F5',
      },
    ],
    '@sentry/react-native/expo',
  ],
  experiments: { typedRoutes: true },
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
});
