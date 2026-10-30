import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors } from '../../theme/tokens';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }} />;
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.bg },
});
