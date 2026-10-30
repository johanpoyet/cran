import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '../theme/tokens';
import { useTabBarClearance } from './tab-bar';
import { Text } from './text';

export interface ScreenProps {
  title: string;
  /** Small line above the title (e.g. today's date). */
  overline?: string;
  /** Element on the right of the title (e.g. "Semaine" chip). */
  accessory?: ReactNode;
  children?: ReactNode;
}

// Tab screen: grey background, large title, content scrolling under the floating bar.
export function Screen({ title, overline, accessory, children }: ScreenProps) {
  const clearance = useTabBarClearance();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: clearance }]}>
        <View style={styles.header}>
          <View style={styles.titles}>
            {overline ? (
              <Text variant="label" weight={500} color="textMuted">
                {overline}
              </Text>
            ) : null}
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
          </View>
          {accessory}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.screen, paddingTop: space[16], gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  titles: { flexShrink: 1, gap: space[4] },
});
