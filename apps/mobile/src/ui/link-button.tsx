import { Pressable, StyleSheet } from 'react-native';

import { touch } from '../theme/tokens';
import { Text } from './text';

export interface LinkButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

// Text-only action in the accent colour ("Continuer avec un email").
export function LinkButton({ label, onPress, disabled = false }: LinkButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dimmed]}
    >
      <Text variant="body" weight={700} color="accent" align="center">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: touch.minSize, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.5 },
});
