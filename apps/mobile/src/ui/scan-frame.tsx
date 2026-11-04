import { StyleSheet, View } from 'react-native';

import { colors, control, radius } from '../theme/tokens';

const { width, height, corner, stroke } = control.scanFrame;

const CORNERS = [
  {
    top: 0,
    left: 0,
    borderTopWidth: stroke,
    borderLeftWidth: stroke,
    borderTopLeftRadius: radius.icon,
  },
  {
    top: 0,
    right: 0,
    borderTopWidth: stroke,
    borderRightWidth: stroke,
    borderTopRightRadius: radius.icon,
  },
  {
    bottom: 0,
    left: 0,
    borderBottomWidth: stroke,
    borderLeftWidth: stroke,
    borderBottomLeftRadius: radius.icon,
  },
  {
    bottom: 0,
    right: 0,
    borderBottomWidth: stroke,
    borderRightWidth: stroke,
    borderBottomRightRadius: radius.icon,
  },
] as const;

// Aiming frame of the scan screen: four white corners and the blue scan line (decorative).
export function ScanFrame() {
  return (
    <View
      style={styles.frame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {CORNERS.map((position, index) => (
        <View key={index} testID="scan-frame-corner" style={[styles.corner, position]} />
      ))}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width, height, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: corner, height: corner, borderColor: colors.onScan },
  line: { width: width - 2 * corner, height: stroke / 2, backgroundColor: colors.accent },
});
