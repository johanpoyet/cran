import { Pressable, StyleSheet } from 'react-native';

import { colors, control, radius } from '../theme/tokens';
import { Text } from './text';

export interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// One of two or three side-by-side choices ("Homme" / "Femme").
export function ChoiceButton({ label, selected, onPress }: ChoiceButtonProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.button, selected && styles.selected]}
    >
      <Text variant="body" weight={700} align="center">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: control.height,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
