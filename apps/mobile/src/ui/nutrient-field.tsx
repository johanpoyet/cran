import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import {
  colors,
  type ColorToken,
  control,
  fontFamily,
  radius,
  space,
  typography,
} from '../theme/tokens';
import { Text } from './text';

export interface NutrientFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'returnKeyType' | 'onSubmitEditing'
> {
  label: string;
  /** Dot before the label: the colour of the macro ("text" for calories). */
  dot: ColorToken;
  /** "kcal" or "g", inside the field on the right. */
  unit: string;
  /** Spoken label, with the unit ("Calories, en kcal pour 100 g"). */
  accessibilityLabel: string;
  invalid?: boolean;
}

// Value per 100 g of the "Nouvel aliment" form: large figure on the left, unit on the right.
export function NutrientField({
  label,
  dot,
  unit,
  accessibilityLabel,
  invalid = false,
  ...input
}: NutrientFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.label}>
        <View style={[styles.dot, { backgroundColor: colors[dot] }]} />
        <Text variant="label" weight={600}>
          {label}
        </Text>
      </View>
      <View style={[styles.box, focused && styles.focused, invalid && styles.invalid]}>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          keyboardType="decimal-pad"
          selectionColor={colors.accent}
          style={styles.input}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          {...input}
        />
        <Text variant="body" color="textMuted">
          {unit}
        </Text>
      </View>
    </View>
  );
}

const DOT = 10;

const styles = StyleSheet.create({
  field: { flex: 1, gap: space[8] },
  label: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
  box: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingHorizontal: space[16],
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: colors.bg,
    backgroundColor: colors.bg,
  },
  focused: { borderColor: colors.accent },
  invalid: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: control.height,
    color: colors.text,
    fontFamily: fontFamily[800],
    fontSize: typography.heading.fontSize,
  },
});
