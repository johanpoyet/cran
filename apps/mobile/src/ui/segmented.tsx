import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// Two or three exclusive tabs on a grey track ("Récents" / "Favoris").
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(option.value);
            }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text
              variant="label"
              weight={selected ? 700 : 600}
              color={selected ? 'text' : 'textMuted'}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: space[4],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  segment: {
    flex: 1,
    minHeight: touch.minSize - space[8],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.surface },
});
