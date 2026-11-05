import {
  formatDecimal,
  formatGrams,
  formatKcal,
  MEAL_TYPES,
  type MealType,
  NEW_FOOD_LIMITS,
  parseDecimal,
  RECIPE_LIMITS,
} from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { deleteEntry, readEntry, scaleEntry, scaleEntryServings, updateEntry } from '../../journal';
import { Sentry } from '../../lib/sentry';
import { colors, radius, space, touch } from '../../theme/tokens';
import { Chip, EmptyState, LinkButton, PrimaryButton, Text, TextField } from '../../ui';

// An entry of the journal (no mockup): change its quantity (in servings for a recipe logged in
// servings, S6-2), move it to another meal, delete it.
export default function EntrySheet() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSessionUserId() ?? '';
  const entry = useLocalQuery(useCallback(() => readEntry(localDb, userId, id), [userId, id]));
  const [quantityText, setQuantityText] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [error, setError] = useState<'invalidQuantity' | 'invalidServings' | 'error' | null>(null);

  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('entry.close')}
      onPress={() => {
        router.back();
      }}
      style={styles.close}
    >
      <X size={22} color={colors.text} />
    </Pressable>
  );

  if (!entry) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titles} />
          {close}
        </View>
        <EmptyState message={t('entry.missing')} />
      </ScrollView>
    );
  }

  // A recipe logged in servings changes in servings, anything else with a weight in grams.
  const byServings = entry.servings !== null;
  const current = entry.servings ?? entry.grams;
  const typed = quantityText ?? (current === null ? '' : formatDecimal(current));
  const quantity = current === null ? null : parseDecimal(typed);
  const max = byServings ? RECIPE_LIMITS.loggedServingsMax : NEW_FOOD_LIMITS.portionGramsMax;
  const valid = quantity !== null && quantity > 0 && quantity <= max;
  const meal = mealType ?? entry.mealType;
  const values =
    quantity !== null && valid
      ? byServings
        ? scaleEntryServings(entry, quantity)
        : scaleEntry(entry, quantity)
      : entry;
  const changed = (current !== null && valid && quantity !== current) || meal !== entry.mealType;

  function save() {
    if (!entry) return;
    if (current !== null && !valid) {
      setError(byServings ? 'invalidServings' : 'invalidQuantity');
      return;
    }
    try {
      updateEntry(localDb, userId, entry.id, {
        ...(quantity !== null && valid
          ? byServings
            ? { servings: quantity }
            : { grams: quantity }
          : {}),
        mealType: meal,
      });
      router.back();
    } catch (saveError) {
      Sentry.captureException(saveError);
      setError('error');
    }
  }

  function confirmDelete() {
    if (!entry) return;
    Alert.alert(t('entry.deleteTitle', { name: entry.label }), t('entry.deleteMessage'), [
      { text: t('entry.deleteCancel'), style: 'cancel' },
      {
        text: t('entry.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteEntry(localDb, userId, entry.id);
            router.back();
          } catch (deleteError) {
            Sentry.captureException(deleteError);
            setError('error');
          }
        },
      },
    ]);
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
            {entry.label}
          </Text>
          <Text variant="body" color="textMuted" accessibilityLiveRegion="polite">
            {t('entry.values', {
              kcal: formatKcal(Math.round(values.kcal)),
              protein: formatDecimal(values.proteinG),
              carbs: formatDecimal(values.carbsG),
              fat: formatDecimal(values.fatG),
            })}
          </Text>
        </View>
        {close}
      </View>

      {current === null ? null : (
        <TextField
          label={t(byServings ? 'entry.servings' : 'entry.quantity')}
          value={typed}
          onChangeText={(text) => {
            setQuantityText(text);
            setError(null);
          }}
          keyboardType="decimal-pad"
          placeholder={byServings ? formatDecimal(current) : formatGrams(current)}
        />
      )}

      <View style={styles.meals}>
        <Text variant="caption" weight={600} color="textMuted">
          {t('entry.move')}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('entry.move')}
          style={styles.chips}
        >
          {MEAL_TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`add.mealShort.${type}`)}
              accessibilityLabel={t(`meals.${type}`)}
              selected={meal === type}
              onPress={() => {
                setMealType(type);
                setError(null);
              }}
            />
          ))}
        </View>
      </View>

      {error ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t(`entry.${error}`)}
        </Text>
      ) : null}

      <PrimaryButton
        label={t('entry.save')}
        disabled={!changed}
        onPress={save}
        {...(changed ? {} : { accessibilityHint: t('entry.saveHint') })}
      />
      <LinkButton label={t('entry.delete')} tone="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[24],
    paddingBottom: space.screen,
    gap: space[20],
  },
  meals: { gap: space[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
