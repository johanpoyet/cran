import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ListRowProps {
  title: string;
  /** Element before the title, usually an IconTile. */
  leading?: ReactNode;
  /** Draws a separator above the row (every row of a card but the first). */
  separator?: boolean;
}

export function ListRow({ title, leading, separator = false }: ListRowProps) {
  return (
    <View style={[styles.row, separator && styles.separator]}>
      {leading}
      <Text variant="body" style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.minSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
  },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  title: { flex: 1 },
});
