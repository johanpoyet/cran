import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, control, fontFamily, radius, space, touch, typography } from '../theme/tokens';

export interface SearchFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'autoFocus'
> {
  /** Spoken name of the field ("Rechercher un aliment"). */
  accessibilityLabel: string;
  /** Spoken name of the clear button, shown when there is text. */
  clearLabel: string;
  onClear: () => void;
}

// Grey rounded search field of the add sheet, with a clear button.
export function SearchField({
  accessibilityLabel,
  clearLabel,
  onClear,
  ...input
}: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <Search color={colors.textMuted} size={control.iconSize + 2} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        autoCorrect={false}
        returnKeyType="search"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={styles.input}
        {...input}
      />
      {input.value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={onClear}
          hitSlop={(touch.minSize - control.iconSize) / 2}
        >
          <X color={colors.textMuted} size={control.iconSize} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: space[20],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: control.height,
    color: colors.text,
    fontFamily: fontFamily[typography.lead.weight],
    fontSize: typography.lead.fontSize,
  },
});
