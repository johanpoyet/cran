import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, type ColorToken, control, radius } from '../theme/tokens';

export interface IconToggleProps {
  icon: LucideIcon;
  /** Spoken name of the option ("Favori"). */
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Icon colour and soft background (the star is orange on orange). */
  color: ColorToken;
  background: ColorToken;
}

// Round on/off button: the icon is filled when on ("Enregistrer l'aliment" favourite star).
export function IconToggle({
  icon: Icon,
  label,
  value,
  onValueChange,
  color,
  background,
}: IconToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        onValueChange(!value);
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors[background] },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={colors[color]}
        fill={value ? colors[color] : 'transparent'}
        size={control.iconSize + 4}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
