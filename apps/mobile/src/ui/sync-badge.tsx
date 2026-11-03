import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, type ColorToken, control, radius } from '../theme/tokens';

export type SyncBadgeState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

const ICONS = {
  synced: { icon: CloudCheck, color: 'success' },
  pending: { icon: CloudUpload, color: 'textMuted' },
  syncing: { icon: RefreshCw, color: 'accent' },
  offline: { icon: CloudOff, color: 'textMuted' },
  error: { icon: CloudAlert, color: 'warning' },
} as const satisfies Record<SyncBadgeState, { icon: unknown; color: ColorToken }>;

export interface SyncBadgeProps {
  state: SyncBadgeState;
  /** "Synchronisé", "Hors ligne, 3 changements partiront au retour du réseau"… */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
}

// Discreet sync indicator in the header of "Ta journée": an icon, the details for VoiceOver.
export function SyncBadge({
  state,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: SyncBadgeProps) {
  const { icon: Icon, color } = ICONS[state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      onPress={onPress}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
    >
      <Icon color={colors[color]} size={control.iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: control.round - 8,
    height: control.round - 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
