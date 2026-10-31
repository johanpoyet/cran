import { StyleSheet, View } from 'react-native';

import { colors, type ColorToken, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface StatTileProps {
  value: string;
  label: string;
  /** Colour of the dot above the value (macro colour). */
  dot: ColorToken;
}

// Small white tile with a coloured dot, a value and its label ("150 g Protéines").
export function StatTile({ value, label, dot }: StatTileProps) {
  return (
    <View accessible accessibilityLabel={`${label} ${value}`} style={styles.tile}>
      <View style={[styles.dot, { backgroundColor: colors[dot] }]} />
      <Text variant="heading" weight={800}>
        {value}
      </Text>
      <Text variant="label" weight={500} color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[16],
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
});
