import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '../theme/tokens';
import { PrimaryButton, type PrimaryButtonProps } from './primary-button';
import { Text } from './text';

export interface StepScreenProps {
  header: ReactNode;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Main action pinned at the bottom ("Continuer"). */
  action: PrimaryButtonProps;
  /** Shown above the action, e.g. an error message. */
  footer?: ReactNode;
}

// Onboarding step: header, large title, scrolling content and a button pinned at the bottom.
export function StepScreen({ header, title, subtitle, children, action, footer }: StepScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        {title ? (
          <View style={styles.titles}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="body" color="textMuted">
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
      <View style={styles.bottom}>
        {footer}
        <PrimaryButton {...action} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[8],
    paddingBottom: space[24],
    gap: space[20],
  },
  titles: { gap: space[8], marginTop: space[8] },
  bottom: { paddingHorizontal: space.screen, paddingBottom: space[8], gap: space[12] },
});
