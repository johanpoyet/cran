import { type AccessibilityActionEvent, Pressable, StyleSheet } from 'react-native';

import { colors, type ColorToken, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface TemplateCardProps {
  /** "Dîner prise de masse" */
  name: string;
  /** "4 aliments · 780 kcal" */
  details: string;
  background: ColorToken;
  /** Applies the template. */
  onPress: () => void;
  /** Menu of the template (rename, delete). */
  onLongPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  /** VoiceOver actions standing in for the long press ("Renommer", "Supprimer"). */
  actions: readonly { name: string; label: string; onAction: () => void }[];
}

// A meal template of the add sheet (mockup 11): name and summary on a soft colour.
export function TemplateCard({
  name,
  details,
  background,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  actions,
}: TemplateCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={actions.map(({ name: action, label }) => ({ name: action, label }))}
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        actions.find(({ name: action }) => action === event.nativeEvent.actionName)?.onAction();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors[background] },
        pressed && styles.pressed,
      ]}
    >
      <Text variant="body" weight={800} numberOfLines={1}>
        {name}
      </Text>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {details}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: control.templateCard,
    maxWidth: control.templateCard * 1.5,
    minHeight: control.height + space[16],
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.card,
  },
  pressed: { opacity: 0.85 },
});
