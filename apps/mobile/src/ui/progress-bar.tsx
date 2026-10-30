import { StyleSheet, View } from 'react-native';

import { colors, type ColorToken, radius } from '../theme/tokens';
import { clampProgress } from './progress';

export interface ProgressBarProps {
  /** Progress between 0 and 1; values outside are clamped. */
  value: number;
  color?: ColorToken;
  trackColor?: ColorToken;
  height?: number;
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  color = 'accent',
  trackColor = 'track',
  height = 10,
  accessibilityLabel,
}: ProgressBarProps) {
  const progress = clampProgress(value);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      style={[styles.track, { height, backgroundColor: colors[trackColor] }]}
    >
      <View
        testID="progress-fill"
        style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors[color] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
