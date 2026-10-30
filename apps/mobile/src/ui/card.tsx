import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadow, space } from '../theme/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space[16],
    boxShadow: shadow.card,
  },
});
