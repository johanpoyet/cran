import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface ValueTileProps {
  /** "16,5" */
  value: string;
  /** "prot. g" */
  label: string;
  /** "Protéines : 16,5 g" */
  accessibilityLabel: string;
}

// Small grey tile with a value and its unit (values of a portion on the scan sheet).
export function ValueTile({ value, label, accessibilityLabel }: ValueTileProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.tile}>
      <Text variant="heading" weight={800}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space[4] / 2,
    paddingVertical: space[12],
    borderRadius: radius.tile,
    backgroundColor: colors.bg,
  },
});
