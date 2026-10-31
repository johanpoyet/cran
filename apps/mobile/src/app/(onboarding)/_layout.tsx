import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { OnboardingProvider } from '../../onboarding';
import { colors } from '../../theme/tokens';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
        <Stack.Screen name="rate" />
        <Stack.Screen name="about" />
        <Stack.Screen name="body" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="training" />
        <Stack.Screen name="summary" />
      </Stack>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.bg },
});
