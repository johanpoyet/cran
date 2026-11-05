import { Pressable, StyleSheet, View } from 'react-native';

import { colors, type ColorToken, radius, space } from '../theme/tokens';
import { LetterTile } from './letter-tile';
import { Text } from './text';

export interface RecipeCardProps {
  name: string;
  /** "Meal prep · 4 parts · 525 g cuit" */
  details: string;
  /** "P 55 · G 78 · L 9" */
  macros: string;
  /** "614" */
  kcal: string;
  /** "kcal / part" */
  kcalUnit: string;
  color: ColorToken;
  background: ColorToken;
  onPress: () => void;
  accessibilityLabel: string;
}

// A recipe of "Mes recettes" (mockup 14): letter tile, name, details and macros, kcal per serving.
export function RecipeCard({
  name,
  details,
  macros,
  kcal,
  kcalUnit,
  color,
  background,
  onPress,
  accessibilityLabel,
}: RecipeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LetterTile
        letter={name.charAt(0).toLocaleUpperCase('fr-FR')}
        color={color}
        background={background}
        size="large"
      />
      <View style={styles.texts}>
        <Text variant="lead" weight={800}>
          {name}
        </Text>
        <Text variant="caption" color="textMuted">
          {details}
        </Text>
        <Text variant="caption" weight={700}>
          {macros}
        </Text>
      </View>
      <View style={styles.kcal}>
        <Text variant="heading" weight={800}>
          {kcal}
        </Text>
        <Text variant="caption" color="textMuted">
          {kcalUnit}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[14],
    padding: space[12],
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  texts: { flex: 1, gap: space[4] / 2 },
  kcal: { alignItems: 'flex-end' },
});
