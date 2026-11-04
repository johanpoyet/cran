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
  /** "onAccent": on the accent hero card of a recipe. */
  tone?: 'default' | 'onAccent';
}

// Small grey tile with a value and its unit (values of a portion on the scan sheet).
export function ValueTile({ value, label, accessibilityLabel, tone = 'default' }: ValueTileProps) {
  const onAccent = tone === 'onAccent';
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.tile, onAccent && styles.onAccent]}
    >
      <Text variant="heading" weight={800} color={onAccent ? 'onAccent' : 'text'}>
        {value}
      </Text>
      <Text variant="caption" color={onAccent ? 'onAccent' : 'textMuted'}>
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
  onAccent: { backgroundColor: colors.onAccentSoft },
});
