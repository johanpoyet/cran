import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme/tokens';
import { Text } from './text';

// Small pill on the accent hero card ("Surplus +250").
export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text variant="label" weight={600} color="onAccent">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space[14],
    paddingVertical: space[4] + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.onAccentSoft,
  },
});
