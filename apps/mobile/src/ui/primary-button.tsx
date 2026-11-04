import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, control, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** "outline": white with a border, for secondary actions ("Continuer avec Google"). */
  variant?: 'accent' | 'outline';
  disabled?: boolean;
  /** Shows a spinner and ignores presses while an action runs. */
  loading?: boolean;
  accessibilityHint?: string;
  /** Icon before the label ("+ Nouvelle recette"), not read by VoiceOver. */
  icon?: LucideIcon;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'accent',
  disabled = false,
  loading = false,
  accessibilityHint,
  icon: Icon,
}: PrimaryButtonProps) {
  const outline = variant === 'outline';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        outline && styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.text : colors.onAccent} />
      ) : (
        <>
          {Icon ? (
            <Icon color={outline ? colors.text : colors.onAccent} size={control.iconSize + 2} />
          ) : null}
          <Text variant="body" weight={700} color={outline ? 'text' : 'onAccent'} align="center">
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Math.max(touch.minSize, control.height),
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    gap: space[8],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[24],
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
