import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';

export interface InfoBannerProps {
  icon: LucideIcon;
  children: ReactNode;
}

// Soft blue explanation ("1 kg par mois, c'est environ +250 kcal par jour…").
export function InfoBanner({ icon: Icon, children }: InfoBannerProps) {
  return (
    <View style={styles.banner}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon color={colors.accent} size={control.iconSize + 2} />
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
    backgroundColor: colors.accentSoft,
  },
  text: { flex: 1 },
});
