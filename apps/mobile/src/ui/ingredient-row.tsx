import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface IngredientRowProps {
  name: string;
  /** "960 kcal · P 184 g" */
  details: string;
  /** "800 g" */
  quantity: string;
  /** Tag of a raw ingredient ("CRU"); nothing when cooked. */
  rawLabel?: string;
  separator?: boolean;
  /** Opens the ingredient (recipe edition); a plain row otherwise. */
  onPress?: () => void;
  accessibilityLabel: string;
}

// An ingredient of a recipe (mockup 15): name and values, "CRU" tag, weight on the right.
export function IngredientRow({
  name,
  details,
  quantity,
  rawLabel,
  separator = false,
  onPress,
  accessibilityLabel,
}: IngredientRowProps) {
  const content = (
    <>
      <View style={styles.texts}>
        <Text variant="body" weight={700}>
          {name}
        </Text>
        <Text variant="caption" color="textMuted">
          {details}
        </Text>
      </View>
      {rawLabel ? (
        <View style={styles.tag}>
          <Text variant="caption" weight={700} color="warning">
            {rawLabel}
          </Text>
        </View>
      ) : null}
      <Text variant="body" weight={800}>
        {quantity}
      </Text>
    </>
  );
  const style = [styles.row, separator && styles.separator];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={accessibilityLabel} style={style}>
      {content}
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
  pressed: { opacity: 0.7 },
  texts: { flex: 1, gap: space[4] / 2 },
  tag: {
    paddingHorizontal: space[10],
    paddingVertical: space[4],
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
});
