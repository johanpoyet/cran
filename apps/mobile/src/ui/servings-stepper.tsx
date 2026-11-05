import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface ServingsStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** "4 parts" */
  format: (value: number) => string;
  /** "Nombre de parts" */
  label: string;
  decrementLabel: string;
  incrementLabel: string;
}

// "− 4 parts +" on the accent hero card of a recipe (mockup 15).
export function ServingsStepper({
  value,
  min,
  max,
  onChange,
  format,
  label,
  decrementLabel,
  incrementLabel,
}: ServingsStepperProps) {
  const set = (next: number) => {
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        set(value + (nativeEvent.actionName === 'increment' ? 1 : -1));
      }}
      style={styles.pill}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        disabled={value <= min}
        onPress={() => {
          set(value - 1);
        }}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <Minus color={colors.onAccent} size={control.iconSize + 2} />
      </Pressable>
      <Text variant="body" weight={700} color="onAccent" style={styles.value}>
        {format(value)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        disabled={value >= max}
        onPress={() => {
          set(value + 1);
        }}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <Plus color={colors.onAccent} size={control.iconSize + 2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.onAccentSoft,
    paddingHorizontal: space[4],
  },
  button: {
    width: touch.minSize,
    height: touch.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  value: { minWidth: 72, textAlign: 'center' },
});
