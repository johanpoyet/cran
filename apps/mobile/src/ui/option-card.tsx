import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface OptionCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  /** Small tag next to the title ("Recommandé"). */
  badge?: string;
}

// One choice of a list with a radio button (rate, activity level).
export function OptionCard({ title, subtitle, selected, onPress, badge }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, badge, subtitle].filter(Boolean).join(', ')}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text variant="heading">{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text variant="caption" weight={700} color="accent">
                {badge.toLocaleUpperCase('fr-FR')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="label" weight={500} color="textMuted">
          {subtitle}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[16] + 2,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.accent },
  texts: { flex: 1, gap: space[4] },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[8] },
  badge: {
    paddingHorizontal: space[8],
    paddingVertical: 2,
    borderRadius: space[8],
    backgroundColor: colors.accentSoft,
  },
  radio: {
    width: control.radio,
    height: control.radio,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  radioDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.onAccent },
});
