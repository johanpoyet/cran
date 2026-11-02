import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  /**
   * "outline" (default): white with a border, dark when selected (meal picker). "soft": blue
   * value ("1 galette = 50 g"). "dashed": action to add an item ("+ Ajouter une portion").
   */
  variant?: 'outline' | 'soft' | 'dashed';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const LABEL_COLOR = { outline: 'text', soft: 'accent', dashed: 'textMuted' } as const;

export function Chip({
  label,
  selected = false,
  variant = 'outline',
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: ChipProps) {
  const extra = (touch.minSize - 36) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      hitSlop={{ top: extra, bottom: extra }}
      onPress={onPress}
      style={[styles.chip, styles[variant], selected && styles.selected]}
    >
      <Text
        variant={variant === 'outline' ? 'caption' : 'label'}
        weight={600}
        color={selected ? 'onAccent' : LABEL_COLOR[variant]}
      >
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
  outline: {},
  soft: { borderColor: colors.accentSoft, backgroundColor: colors.accentSoft },
  dashed: { borderStyle: 'dashed', borderColor: colors.textMuted },
  selected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
});
