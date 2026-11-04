import { ChevronDown } from 'lucide-react-native';
import { ActionSheetIOS, Platform, Pressable, StyleSheet } from 'react-native';

import { colors, control, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface MenuButtonProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Spoken name of the choice ("Repas"); VoiceOver also reads the current option. */
  accessibilityLabel: string;
  /** Last button of the iOS menu ("Annuler"). */
  cancelLabel: string;
}

// Grey pill showing the current option with a chevron ("Collation ⌄"); opens the iOS action sheet.
// Android has no action sheet: the button moves to the next option.
export function MenuButton<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  cancelLabel,
}: MenuButtonProps<T>) {
  const current = options.find((option) => option.value === value);

  function open() {
    if (Platform.OS !== 'ios') {
      const index = options.findIndex((option) => option.value === value);
      const next = options[(index + 1) % options.length];
      if (next) onChange(next.value);
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options.map((option) => option.label), cancelLabel],
        cancelButtonIndex: options.length,
        title: accessibilityLabel,
      },
      (index) => {
        const chosen = options[index];
        if (chosen) onChange(chosen.value);
      },
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel} : ${current?.label ?? ''}`}
      onPress={open}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text variant="body" weight={700}>
        {current?.label}
      </Text>
      <ChevronDown color={colors.text} size={control.iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.minSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingHorizontal: space[20],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  pressed: { opacity: 0.7 },
});
