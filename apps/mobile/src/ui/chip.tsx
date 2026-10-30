import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

// Selected chips are dark, as in the meal picker of the add sheet.
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const extra = (touch.minSize - 36) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: extra, bottom: extra }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text variant="caption" weight={600} color={selected ? 'onAccent' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: space[14],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
});
