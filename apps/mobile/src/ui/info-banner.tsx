import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, type ColorToken, control, radius, space } from '../theme/tokens';

export type BannerTone = 'info' | 'success' | 'warning';

/** Icon colour and background of each tone; texts inside use the same colour token. */
export const BANNER_TONES: Record<BannerTone, { color: ColorToken; background: ColorToken }> = {
  info: { color: 'accent', background: 'accentSoft' },
  success: { color: 'success', background: 'successSoft' },
  warning: { color: 'warning', background: 'warningSoft' },
};

export interface InfoBannerProps {
  icon: LucideIcon;
  /** "info" (default): soft blue explanation; "success" / "warning": result of a check. */
  tone?: BannerTone;
  children: ReactNode;
}

// Soft blue explanation ("1 kg par mois, c'est environ +250 kcal par jour…"), or the result of a
// check ("Cohérent : 4×P + 4×G + 9×L = 162 kcal").
export function InfoBanner({ icon: Icon, tone = 'info', children }: InfoBannerProps) {
  const { color, background } = BANNER_TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: colors[background] }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon color={colors[color]} size={control.iconSize + 2} />
      </View>
      <View style={styles.text}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[14],
    padding: space[16],
    borderRadius: radius.card,
  },
  text: { flex: 1 },
});
