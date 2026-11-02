import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, control, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  /**
   * "outline" (default): white with a border, dark when selected (meal picker). "soft": blue
   * value ("1 galette = 50 g"). "dashed": action to add an item ("+ Ajouter une portion").
   */
  variant?: 'outline' | 'soft' | 'dashed';
  /** Icon before the label ("Semaine" with a calendar). */
  icon?: LucideIcon;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const LABEL_COLOR = { outline: 'text', soft: 'accent', dashed: 'textMuted' } as const;

export function Chip({
  label,
  selected = false,
  variant = 'outline',
  icon: Icon,
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
      {Icon ? (
        <Icon
          color={colors[selected ? 'onAccent' : LABEL_COLOR[variant]]}
          size={control.iconSize}
        />
      ) : null}
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
    flexDirection: 'row',
    gap: space[8],
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
