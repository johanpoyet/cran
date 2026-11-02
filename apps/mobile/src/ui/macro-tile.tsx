import { StyleSheet, View } from 'react-native';

import { type ColorToken, control, space } from '../theme/tokens';
import { Card } from './card';
import { MacroRing } from './macro-ring';
import { Text } from './text';

export interface MacroTileProps {
  /** "128 g" */
  value: string;
  /** "Protéines" */
  label: string;
  /** Eaten / target, between 0 and 1. */
  progress: number;
  color: ColorToken;
  /** "Protéines : 128 g sur 150 g" */
  accessibilityLabel: string;
}

// One of the three macro cards of "Ta journée": ring, grams eaten, name of the macro.
export function MacroTile({ value, label, progress, color, accessibilityLabel }: MacroTileProps) {
  return (
    <Card style={styles.tile} accessible accessibilityLabel={accessibilityLabel}>
      <MacroRing value={progress} color={color} size={control.macroRing} strokeWidth={9} />
      <View style={styles.texts}>
        <Text variant="heading" weight={800} align="center">
          {value}
        </Text>
        <Text variant="caption" color="textMuted" align="center">
          {label}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: space[12], paddingVertical: space[20] },
  texts: { alignItems: 'center' },
});
