import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Spoken name of the value ("Année de naissance"). */
  label: string;
  decrementLabel: string;
  incrementLabel: string;
  /** Line under the value ("21 ans"). */
  caption?: string;
  /** Change of one press (1 by default; 250 for the water goal in ml). */
  step?: number;
  /** Text of the value ("3 L"); the number itself by default. */
  format?: (value: number) => string;
}

// Big number with − and + buttons (year of birth).
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  decrementLabel,
  incrementLabel,
  caption,
  step = 1,
  format = String,
}: StepperProps) {
  const set = (next: number) => {
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: caption ? `${format(value)}, ${caption}` : format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        set(value + (nativeEvent.actionName === 'increment' ? step : -step));
      }}
      style={styles.stepper}
    >
      <View style={styles.row}>
        <RoundButton
          label={decrementLabel}
          disabled={value <= min}
          onPress={() => {
            set(value - step);
          }}
        >
          <Minus color={colors.text} size={24} />
        </RoundButton>
        <Text variant="display" align="center" style={styles.value}>
          {format(value)}
        </Text>
        <RoundButton
          label={incrementLabel}
          disabled={value >= max}
          onPress={() => {
            set(value + step);
          }}
        >
          <Plus color={colors.text} size={24} />
        </RoundButton>
      </View>
      {caption ? (
        <Text variant="label" weight={500} color="textMuted" align="center">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function RoundButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.round, (pressed || disabled) && styles.dimmed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { gap: space[12] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flex: 1 },
  round: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.4 },
});
