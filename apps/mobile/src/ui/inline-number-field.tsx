import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, control, fontFamily, radius, space, typography } from '../theme/tokens';
import { Text } from './text';

export interface InlineNumberFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'onEndEditing' | 'placeholder'
> {
  /** "g", inside the field on the right. */
  unit: string;
  /** Spoken label, with the unit ("Poids total une fois cuit, en grammes"). */
  accessibilityLabel: string;
}

// Small grey number field at the end of a row ("Poids total une fois cuit · 2 100 g").
export function InlineNumberField({ unit, accessibilityLabel, ...input }: InlineNumberFieldProps) {
  return (
    <View style={styles.field}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={styles.input}
        {...input}
      />
      <Text variant="lead" weight={400} color="textMuted">
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: control.height,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingHorizontal: space[16],
    borderRadius: radius.tile,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: control.height,
    textAlign: 'right',
    color: colors.text,
    fontFamily: fontFamily[typography.heading.weight],
    fontSize: typography.heading.fontSize,
  },
});
