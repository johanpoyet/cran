import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ListRowProps {
  title: string;
  /** Element before the title, usually an IconTile. */
  leading?: ReactNode;
  /** Draws a separator above the row (every row of a card but the first). */
  separator?: boolean;
  /** Opens another screen: the row becomes a button with a chevron ("Mes recettes"). */
  onPress?: () => void;
}

export function ListRow({ title, leading, separator = false, onPress }: ListRowProps) {
  const style = [styles.row, separator && styles.separator];
  const content = (
    <>
      {leading}
      <Text variant="body" style={styles.title}>
        {title}
      </Text>
      {onPress ? <ChevronRight color={colors.textMuted} size={control.iconSize} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
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
  pressed: { opacity: 0.7 },
  title: { flex: 1 },
});
