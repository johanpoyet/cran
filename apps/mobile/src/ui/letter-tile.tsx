import { StyleSheet, View } from 'react-native';

import { colors, type ColorToken, control, radius } from '../theme/tokens';
import { Text } from './text';

export interface LetterTileProps {
  /** First letter of the name ("S" for "Skyr nature 0 %"). */
  letter: string;
  color?: ColorToken;
  background?: ColorToken;
  /** "large": recipe cards of "Mes recettes". */
  size?: 'default' | 'large';
}

// Rounded tile with a letter, in front of a product or recipe name. Decorative.
export function LetterTile({
  letter,
  color = 'accent',
  background = 'accentSoft',
  size = 'default',
}: LetterTileProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        size === 'large' && styles.large,
        { backgroundColor: colors[background] },
      ]}
    >
      <Text variant={size === 'large' ? 'title' : 'heading'} weight={800} color={color}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: control.round,
    height: control.round,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { width: control.recipeTile, height: control.recipeTile, borderRadius: radius.card },
});
