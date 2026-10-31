import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius, ruler, space } from '../theme/tokens';
import { Text } from './text';

export interface RulerPickerProps {
  value: number;
  min: number;
  max: number;
  /** Value between two ticks (1 cm, 0.1 kg). */
  step: number;
  onChange: (value: number) => void;
  /** Value as displayed ("68,4"). */
  format: (value: number) => string;
  unit: string;
  /** Spoken name ("Poids actuel"). */
  label: string;
  /** A long tick every n ticks. */
  majorEvery?: number;
}

/** Index of the tick under the cursor for a horizontal scroll offset, kept in range. */
export function tickIndexAt(offsetX: number, tickCount: number): number {
  return Math.min(tickCount - 1, Math.max(0, Math.round(offsetX / ruler.tickSpacing)));
}

// Horizontal ruler scrolled under a fixed cursor (height and weight of the onboarding).
export function RulerPicker({
  value,
  min,
  max,
  step,
  onChange,
  format,
  unit,
  label,
  majorEvery = 5,
}: RulerPickerProps) {
  const list = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const tickCount = Math.round((max - min) / step) + 1;
  const indexOf = (v: number) => Math.round((v - min) / step);
  const valueAt = (index: number) => Number((min + index * step).toFixed(decimals));
  const ticks = useMemo(() => Array.from({ length: tickCount }, (_, index) => index), [tickCount]);

  // Follows changes that do not come from scrolling (VoiceOver increments).
  const scrolledIndex = useRef(indexOf(value));
  useEffect(() => {
    const index = indexOf(value);
    if (width > 0 && index !== scrolledIndex.current) {
      scrolledIndex.current = index;
      list.current?.scrollToOffset({ offset: index * ruler.tickSpacing, animated: false });
    }
  });

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = tickIndexAt(event.nativeEvent.contentOffset.x, tickCount);
    if (index !== scrolledIndex.current) {
      scrolledIndex.current = index;
      onChange(valueAt(index));
    }
  }

  function adjust(direction: 1 | -1) {
    const index = Math.min(tickCount - 1, Math.max(0, indexOf(value) + direction));
    onChange(valueAt(index));
  }

  const sidePadding = Math.max(0, width / 2 - ruler.tickSpacing / 2);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format(value)} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        adjust(nativeEvent.actionName === 'increment' ? 1 : -1);
      }}
    >
      <View style={styles.reading}>
        <Text variant="display" style={styles.number}>
          {format(value)}
        </Text>
        <Text variant="heading" color="textMuted">
          {unit}
        </Text>
      </View>
      <View
        style={styles.track}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
        }}
      >
        {width > 0 ? (
          <FlatList
            ref={list}
            testID="ruler-scroll"
            horizontal
            data={ticks}
            keyExtractor={String}
            initialScrollIndex={indexOf(value)}
            // Offsets without the side padding: scrolling to a tick's offset centres it.
            getItemLayout={(_, index) => ({
              length: ruler.tickSpacing,
              offset: ruler.tickSpacing * index,
              index,
            })}
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            renderItem={({ item }) => (
              <View style={styles.slot}>
                <View
                  style={[styles.tick, item % majorEvery === 0 ? styles.major : styles.minor]}
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ruler.tickSpacing}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            initialNumToRender={60}
            windowSize={5}
          />
        ) : null}
        <View pointerEvents="none" style={styles.cursor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: space[8],
  },
  number: { fontVariant: ['tabular-nums'] },
  track: { height: ruler.cursorHeight, justifyContent: 'center', marginTop: space[12] },
  slot: { width: ruler.tickSpacing, alignItems: 'center', justifyContent: 'center' },
  tick: { width: ruler.tickWidth, borderRadius: radius.pill },
  minor: { height: ruler.minorHeight, backgroundColor: colors.border },
  major: { height: ruler.majorHeight, backgroundColor: colors.textMuted },
  cursor: {
    position: 'absolute',
    alignSelf: 'center',
    width: ruler.tickWidth + 2,
    height: ruler.cursorHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
