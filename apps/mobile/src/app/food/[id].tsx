import {
  formatDecimal,
  formatGrams,
  formatKcal,
  NEW_FOOD_LIMITS,
  nutritionFor,
  parseDecimal,
} from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Star, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import {
  defaultGrams,
  isFavorite,
  readFood,
  readLastGrams,
  readPortions,
  setFavorite,
} from '../../foods';
import { useAddSelection } from '../../journal';
import { colors, type ColorToken, radius, space, touch } from '../../theme/tokens';
import { Card, Chip, EmptyState, IconToggle, PrimaryButton, Text, TextField } from '../../ui';

const MACROS = [
  { key: 'protein', value: 'proteinG', color: 'protein' },
  { key: 'carbs', value: 'carbsG', color: 'carbs' },
  { key: 'fat', value: 'fatG', color: 'fat' },
] as const satisfies readonly { key: string; value: string; color: ColorToken }[];

// Quantity of a food before adding it (no mockup): grams or a named portion, values for that
// quantity, favourite. "Valider" selects the food with this quantity in the add sheet.
export default function QuantitySheet() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSessionUserId() ?? '';
  const shown = useAddSelection((state) => state.shown.get(id));
  const selected = useAddSelection((state) => state.selected.get(id));
  const local = useLocalQuery(useCallback(() => readFood(localDb, id), [id]));
  const food = shown ?? local;
  const portions = useLocalQuery(
    useCallback(() => readPortions(localDb, userId, id), [userId, id]),
  );
  const favorite = useLocalQuery(useCallback(() => isFavorite(localDb, userId, id), [userId, id]));
  const lastGrams = useLocalQuery(
    useCallback(() => readLastGrams(localDb, userId).get(id) ?? null, [userId, id]),
  );

  const [gramsText, setGramsText] = useState<string | null>(null);
  const [portionLabel, setPortionLabel] = useState<string | null | undefined>(undefined);
  const [invalid, setInvalid] = useState(false);

  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('quantity.close')}
      onPress={() => {
        router.back();
      }}
      style={styles.close}
    >
      <X size={22} color={colors.text} />
    </Pressable>
  );

  if (!food) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titles} />
          {close}
        </View>
        <EmptyState message={t('quantity.missing')} />
      </ScrollView>
    );
  }

  // Prefilled with the quantity already selected, else the last one used, else the usual one.
  const initialGrams = selected?.grams ?? defaultGrams(food, lastGrams);
  const typed = gramsText ?? formatDecimal(initialGrams);
  const grams = parseDecimal(typed);
  const valid = grams !== null && grams > 0 && grams <= NEW_FOOD_LIMITS.portionGramsMax;
  const chosenPortion =
    portionLabel === undefined ? (selected?.portionLabel ?? null) : portionLabel;
  const values = nutritionFor(food, valid ? grams : 0);

  const choices = [
    ...portions.map((portion) => ({ label: portion.label, grams: portion.grams })),
    ...(food.defaultPortionG !== null
      ? [{ label: t('quantity.defaultPortion'), grams: food.defaultPortionG }]
      : []),
  ];

  function choose(choice: { label: string | null; grams: number }) {
    setGramsText(formatDecimal(choice.grams));
    setPortionLabel(choice.label);
    setInvalid(false);
  }

  function confirm() {
    if (!food) return;
    if (grams === null || !valid) {
      setInvalid(true);
      return;
    }
    useAddSelection.getState().select({ food, grams, portionLabel: chosenPortion });
    router.back();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="title" accessibilityRole="header">
            {food.name}
          </Text>
          <Text variant="body" color="textMuted">
            {food.brand ? `${food.brand} · ` : ''}
            {t('quantity.per100g', { kcal: formatKcal(Math.round(food.kcal100g)) })}
          </Text>
        </View>
        {close}
      </View>

      <Card style={styles.values} accessible accessibilityLiveRegion="polite">
        <Text variant="caption" weight={600} color="textMuted">
          {t('quantity.values')}
        </Text>
        <Text variant="display">{formatKcal(Math.round(values.kcal))}</Text>
        <View style={styles.macros}>
          {MACROS.map(({ key, value, color }) => (
            <View key={key} style={styles.macro}>
              <View style={[styles.dot, { backgroundColor: colors[color] }]} />
              <Text variant="label">
                {`${t(`macros.${key}`)} ${formatDecimal(values[value])} g`}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <TextField
        label={t('quantity.grams')}
        value={typed}
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          setGramsText(text);
          setPortionLabel(null);
          setInvalid(false);
        }}
      />

      <View style={styles.portions}>
        <Text variant="caption" weight={600} color="textMuted">
          {t('quantity.portions')}
        </Text>
        <View style={styles.chips}>
          {choices.map((choice) => (
            <Chip
              key={`${choice.label}-${String(choice.grams)}`}
              label={t('quantity.portion', {
                label: choice.label,
                grams: formatGrams(choice.grams),
              })}
              variant="soft"
              selected={chosenPortion === choice.label && grams === choice.grams}
              onPress={() => {
                choose(choice);
              }}
            />
          ))}
          <Chip
            label={t('quantity.hundred')}
            variant="soft"
            selected={chosenPortion === null && grams === 100}
            onPress={() => {
              choose({ label: null, grams: 100 });
            }}
          />
        </View>
      </View>

      {invalid ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t('quantity.invalid')}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <IconToggle
          icon={Star}
          label={t('quantity.favorite')}
          value={favorite}
          onValueChange={(on) => {
            setFavorite(localDb, userId, food, on);
          }}
          color="protein"
          background="proteinSoft"
        />
        <View style={styles.confirm}>
          <PrimaryButton
            label={t('quantity.confirm')}
            accessibilityHint={t('quantity.confirmHint')}
            onPress={confirm}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const DOT = 10;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[24],
    paddingBottom: space.screen,
    gap: space[20],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[12],
  },
  titles: { flex: 1, gap: space[4] },
  close: {
    width: touch.minSize + space[8],
    height: touch.minSize + space[8],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  values: { gap: space[8], backgroundColor: colors.bg },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: space[16] },
  macro: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
  portions: { gap: space[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  confirm: { flex: 1 },
});
