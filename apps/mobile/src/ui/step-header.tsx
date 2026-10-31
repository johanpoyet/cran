import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface StepHeaderProps {
  onBack: () => void;
  backLabel: string;
  /** Current step and step count: draws the progress bar and "2/5". */
  progress?: { step: number; total: number; label: string };
  /** Title next to the back button, for screens without progress ("Ta cible de départ"). */
  title?: string;
}

export function StepHeader({ onBack, backLabel, progress, title }: StepHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ChevronLeft color={colors.text} size={24} />
      </Pressable>
      {progress ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={progress.label}
          accessibilityValue={{ min: 1, max: progress.total, now: progress.step }}
          style={styles.progress}
        >
          <View style={styles.segments}>
            {Array.from({ length: progress.total }, (_, index) => (
              <View
                key={index}
                style={[styles.segment, index < progress.step && styles.segmentDone]}
              />
            ))}
          </View>
          <Text variant="label" color="textMuted">
            {`${String(progress.step)}/${String(progress.total)}`}
          </Text>
        </View>
      ) : null}
      {title ? (
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: control.round },
  back: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  segments: { flex: 1, flexDirection: 'row', gap: space[4] + 2 },
  segment: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.track },
  segmentDone: { backgroundColor: colors.accent },
  title: { flex: 1 },
});
