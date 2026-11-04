import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, control, radius } from '../theme/tokens';

export interface CameraButtonProps {
  icon: LucideIcon;
  /** Spoken name ("Fermer", "Lampe"). */
  label: string;
  onPress: () => void;
  /** Set for an on/off button (torch): read as a switch, the icon is filled when on. */
  value?: boolean;
}

// Round translucent button over the camera of the scan screen (close, torch).
export function CameraButton({ icon: Icon, label, onPress, value }: CameraButtonProps) {
  const toggle = value !== undefined;
  return (
    <Pressable
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={label}
      {...(toggle ? { accessibilityState: { checked: value } } : {})}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon
        color={colors.onScan}
        fill={value ? colors.onScan : 'transparent'}
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
    backgroundColor: colors.scanControl,
  },
  pressed: { opacity: 0.7 },
});
