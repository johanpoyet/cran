import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, control, radius, space } from '../theme/tokens';
import { Text } from './text';

export interface FoodRowProps {
  name: string;
  /** "130 kcal · P 2,7 · G 28 / 100 g" */
  details: string;
  /** Quantity pill shown once selected ("250 g"). */
  quantity?: string;
  selected: boolean;
  onToggle: () => void;
  /** "Ajouter Riz basmati cuit" / "Retirer Riz basmati cuit" */
  toggleLabel: string;
  /** Touching the quantity pill (opens the quantity sheet). */
  onQuantityPress?: () => void;
  quantityLabel?: string;
}

// A result of the add sheet: name and values per 100 g, quantity, round add / selected button.
export function FoodRow({
  name,
  details,
  quantity,
  selected,
  onToggle,
  toggleLabel,
  onQuantityPress,
  quantityLabel,
}: FoodRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text variant="lead" weight={700} numberOfLines={2}>
          {name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {details}
        </Text>
      </View>
      {quantity ? (
        <Pressable
          accessibilityRole="button"
          {...(quantityLabel ? { accessibilityLabel: quantityLabel } : {})}
          disabled={!onQuantityPress}
          onPress={onQuantityPress}
          style={styles.quantity}
        >
          <Text variant="label" weight={700} color="accent">
            {quantity}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ checked: selected }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.toggle,
          selected && styles.selected,
          pressed && styles.pressed,
        ]}
      >
        {selected ? (
          <Check color={colors.onAccent} size={control.iconSize + 4} strokeWidth={2.5} />
        ) : (
          <Plus color={colors.text} size={control.iconSize + 4} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[10] },
  texts: { flex: 1, gap: space[4] / 2 },
  quantity: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space[14],
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  toggle: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.accent },
  pressed: { opacity: 0.8 },
});
