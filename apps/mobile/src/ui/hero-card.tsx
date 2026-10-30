import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, space } from '../theme/tokens';

// Accent card for the key number of a screen ("Il te reste 760 kcal").
export function HeroCard({ style, ...rest }: ViewProps) {
  return <View style={[styles.hero, style]} {...rest} />;
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radius.hero,
    padding: space[24],
  },
});
