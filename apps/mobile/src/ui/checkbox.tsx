import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, space } from '../theme/tokens';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Spoken label; the visible label is `children`. */
  label: string;
  children: ReactNode;
}

export function Checkbox({ checked, onChange, label, children }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => {
        onChange(!checked);
      }}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.checked]}>
        {checked ? <Check color={colors.onAccent} size={18} strokeWidth={3} /> : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[14] },
  box: {
    width: control.checkbox,
    height: control.checkbox,
    marginTop: 2,
    borderRadius: space[8] - 2,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { flex: 1 },
});
