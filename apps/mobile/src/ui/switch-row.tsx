import { StyleSheet, Switch, View } from 'react-native';

import { colors, space, touch } from '../theme/tokens';
import { Text } from './text';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

// Setting with a title, an explanation and an on/off switch ("Bonus jour de séance").
export function SwitchRow({ title, subtitle, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text variant="body" weight={700}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" weight={500} color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        {...(subtitle ? { accessibilityHint: subtitle } : {})}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.track }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.track}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.minSize, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  texts: { flex: 1, gap: space[4] / 2 },
});
