import { StyleSheet } from 'react-native';

import { Text } from './text';

// Small uppercase label at the top of a card ("SEXE", "TAILLE").
export function Overline({ children }: { children: string }) {
  return (
    <Text variant="caption" weight={700} color="textMuted" style={styles.overline}>
      {children.toLocaleUpperCase('fr-FR')}
    </Text>
  );
}

const styles = StyleSheet.create({ overline: { letterSpacing: 0.5 } });
