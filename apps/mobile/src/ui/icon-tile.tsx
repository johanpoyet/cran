import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, type ColorToken, control, radius } from '../theme/tokens';

export interface IconTileProps {
  icon: LucideIcon;
  color: ColorToken;
  background: ColorToken;
}

// Decorative icon in a soft-coloured square, at the start of a list row.
export function IconTile({ icon: Icon, color, background }: IconTileProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: colors[background] }]}
    >
      <Icon color={colors[color]} size={control.iconSize} strokeWidth={2.25} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: control.iconTile,
    height: control.iconTile,
    borderRadius: radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
