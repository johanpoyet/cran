import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, control, fontFamily, radius, space, typography } from '../theme/tokens';
import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Short help under the field (e.g. "8 caractères minimum"). */
  hint?: string;
}

// The border turns blue while typing, as on the "Nouvel aliment" mockup.
export function TextField({ label, hint, onFocus, onBlur, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text variant="caption" weight={600} color="textMuted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        {...(hint ? { accessibilityHint: hint } : {})}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, focused && styles.focused]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...input}
      />
      {hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[8] },
  input: {
    minHeight: control.height,
    paddingHorizontal: space[16],
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fontFamily[typography.body.weight],
    fontSize: typography.body.fontSize,
  },
  focused: { borderColor: colors.accent, borderWidth: 1.5 },
});
