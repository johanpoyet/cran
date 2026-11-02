import { Pressable, StyleSheet, View } from 'react-native';

import { colors, type ColorToken, control, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface MealRowProps {
  /** "P" for petit-déjeuner. */
  letter: string;
  title: string;
  /** "3 aliments · 8h10", or "Touche pour ajouter" when empty. */
  subtitle: string;
  /** Calories of the meal; nothing when empty. */
  value?: string;
  color: ColorToken;
  background: ColorToken;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

// A meal of "Ta journée": letter tile, name, count and time, calories on the right.
export function MealRow({
  letter,
  title,
  subtitle,
  value,
  color,
  background,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: MealRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: colors[background] }]}>
        <Text variant="heading" weight={800} color={color}>
          {letter}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="lead" weight={700}>
          {title}
        </Text>
        <Text variant="caption" color="textMuted">
          {subtitle}
        </Text>
      </View>
      {value ? (
        <Text variant="lead" weight={800}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.minSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    padding: space[14],
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: control.mealTile,
    height: control.mealTile,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: space[4] / 2 },
});
