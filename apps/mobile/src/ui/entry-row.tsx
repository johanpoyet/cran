import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface EntryRowProps {
  title: string;
  /** "250 g · P 6,8 · G 70 · L 1" */
  details: string;
  /** Calories ("325"). */
  value: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  separator?: boolean;
}

// An entry of a meal: name, quantity and macros, calories; opens the entry to edit it.
export function EntryRow({
  title,
  details,
  value,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  separator = false,
}: EntryRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        separator && styles.separator,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.texts}>
        <Text variant="body" weight={700} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color="textMuted">
          {details}
        </Text>
      </View>
      <Text variant="body" weight={800}>
        {value}
      </Text>
      <ChevronRight color={colors.textMuted} size={control.iconSize} />
    </Pressable>
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
  texts: { flex: 1, gap: space[4] / 2 },
});
