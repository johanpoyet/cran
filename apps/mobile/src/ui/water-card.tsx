import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space, touch } from '../theme/tokens';
import { clampProgress } from './progress';
import { Text } from './text';

export const WATER_SEGMENTS = 8;

export interface WaterCardProps {
  label: string;
  /** "1,5 / 3 L" */
  amount: string;
  /** Drunk / goal, between 0 and 1: fills the segments. */
  progress: number;
  onAdd: () => void;
  /** "Ajouter un verre de 250 ml" */
  addLabel: string;
  onPress: () => void;
  /** "Eau : 1,5 L sur 3 L" */
  accessibilityLabel: string;
  accessibilityHint?: string;
}

// "Eau" card of "Ta journée": amount, eight segments of the goal, + for a glass.
export function WaterCard({
  label,
  amount,
  progress,
  onAdd,
  addLabel,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: WaterCardProps) {
  const filled = Math.round(clampProgress(progress) * WATER_SEGMENTS);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        {...(accessibilityHint ? { accessibilityHint } : {})}
        onPress={onPress}
        style={styles.main}
      >
        <View style={styles.texts}>
          <Text variant="body" weight={700}>
            {label}
          </Text>
          <Text variant="caption" color="textMuted">
            {amount}
          </Text>
        </View>
        <View style={styles.segments}>
          {Array.from({ length: WATER_SEGMENTS }, (_, index) => (
            <View key={index} style={[styles.segment, index < filled && styles.filled]} />
          ))}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        onPress={onAdd}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Plus color={colors.water} size={control.iconSize + 4} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[14],
    paddingLeft: space[16],
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    minHeight: touch.minSize,
  },
  texts: { flex: 1 },
  segments: { flexDirection: 'row', gap: space[4] + 2 },
  segment: {
    width: control.waterSegment.width,
    height: control.waterSegment.height,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
  },
  filled: { backgroundColor: colors.water },
  add: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    backgroundColor: colors.waterSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
