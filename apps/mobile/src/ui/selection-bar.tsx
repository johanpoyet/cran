import { StyleSheet, View } from 'react-native';

import { colors, space } from '../theme/tokens';
import { PrimaryButton } from './primary-button';
import { Text } from './text';

export interface SelectionBarProps {
  /** "2 aliments sélectionnés" */
  label: string;
  /** "+ 498 kcal" */
  total: string;
  action: string;
  onAction: () => void;
}

// Bottom bar of the add sheet: what is selected and the button that adds it.
export function SelectionBar({ label, total, action, onAction }: SelectionBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.texts} accessible accessibilityLiveRegion="polite">
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="title">{total}</Text>
      </View>
      <View style={styles.action}>
        <PrimaryButton label={action} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    paddingHorizontal: space.screen,
    paddingVertical: space[16],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1 },
  action: { minWidth: 140 },
});
