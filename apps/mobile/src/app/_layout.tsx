import '../i18n';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStatus } from '../auth';
import { initSentry, Sentry } from '../lib/sentry';
import { colors, radius } from '../theme/tokens';

initSentry();

const HOME = { signedOut: '/sign-in', onboarding: '/rate', ready: '/' } as const;
void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const authStatus = useAuthStatus();
  // The splash screen stays up until fonts are loaded and the session is known.
  const ready = (fontsLoaded || fontError !== null) && authStatus !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (authStatus === 'loading' || !ready) return null;
  // Where each state starts; any other group redirects there.
  const home = HOME[authStatus];

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Navigation guard: signed out → sign-in screens, signed in without a profile →
            onboarding, onboarded → the app. Signing in or out, finishing the onboarding or a
            revoked session switches group. */}
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
          <Stack.Protected guard={authStatus === 'ready'} redirectTo={home}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="add"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.9],
                sheetGrabberVisible: true,
                sheetCornerRadius: radius.hero,
                contentStyle: styles.sheet,
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={authStatus === 'onboarding'} redirectTo={home}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={authStatus === 'signedOut'} redirectTo={home}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { backgroundColor: colors.bg },
  sheet: { backgroundColor: colors.surface },
});
