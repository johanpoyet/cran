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
  const signedIn = authStatus === 'signedIn';
  // The splash screen stays up until fonts are loaded and the session is known.
  const ready = (fontsLoaded || fontError !== null) && authStatus !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Navigation guard: the app needs a session, the sign-in screens need none. Signing in
            or out (or a revoked session) switches between the two groups. */}
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
          <Stack.Protected guard={signedIn} redirectTo="/sign-in">
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
          <Stack.Protected guard={!signedIn} redirectTo="/">
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
