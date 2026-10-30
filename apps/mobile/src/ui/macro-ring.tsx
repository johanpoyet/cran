import Svg, { Circle } from 'react-native-svg';

import { colors, type ColorToken } from '../theme/tokens';
import { clampProgress } from './progress';

export interface MacroRingProps {
  /** Progress between 0 and 1; values outside are clamped. */
  value: number;
  color: ColorToken;
  size?: number;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

// Progress ring starting at 12 o'clock, clockwise, with rounded ends.
export function MacroRing({
  value,
  color,
  size = 56,
  strokeWidth = 8,
  accessibilityLabel,
}: MacroRingProps) {
  const progress = clampProgress(value);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <Svg
      width={size}
      height={size}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
    >
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={colors.track}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {progress > 0 && (
        <Circle
          testID="macro-ring-progress"
          cx={center}
          cy={center}
          r={r}
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
    </Svg>
  );
}
