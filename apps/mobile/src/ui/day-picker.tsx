import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface DayPickerProps {
  /** 7-bit mask, Monday = bit 0. */
  mask: number;
  onChange: (mask: number) => void;
  /** One letter per day, Monday first ("L", "M"…). */
  letters: readonly string[];
  /** Full names for screen readers, Monday first. */
  names: readonly string[];
}

// Seven day toggles (training days). Each button fills its seventh of the row, so the touch
// target stays at least 44 pt wide even though the drawn pill is narrower.
export function DayPicker({ mask, onChange, letters, names }: DayPickerProps) {
  return (
    <View style={styles.row}>
      {letters.map((letter, day) => {
        const selected = (mask & (1 << day)) !== 0;
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityLabel={names[day]}
            accessibilityState={{ checked: selected }}
            onPress={() => {
              onChange(mask ^ (1 << day));
            }}
            style={styles.slot}
          >
            <View style={[styles.day, selected && styles.selected]}>
              <Text variant="label" weight={700} color={selected ? 'onAccent' : 'textMuted'}>
                {letter}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  slot: { flex: 1, minWidth: 44, paddingHorizontal: space[4] / 2 },
  day: {
    height: control.dayHeight,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
});
