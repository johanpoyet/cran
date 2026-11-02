import {
  formatDecimal,
  formatGrams,
  formatKcal,
  MEAL_TYPES,
  type MealType,
  NEW_FOOD_LIMITS,
  parseDecimal,
} from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { deleteEntry, readEntry, scaleEntry, updateEntry } from '../../journal';
import { Sentry } from '../../lib/sentry';
import { colors, radius, space, touch } from '../../theme/tokens';
import { Chip, EmptyState, LinkButton, PrimaryButton, Text, TextField } from '../../ui';

// An entry of the journal (no mockup): change its quantity, move it to another meal, delete it.
export default function EntrySheet() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSessionUserId() ?? '';
  const entry = useLocalQuery(useCallback(() => readEntry(localDb, userId, id), [userId, id]));
  const [gramsText, setGramsText] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [error, setError] = useState<'invalidQuantity' | 'error' | null>(null);

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
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titles} />
          {close}
        </View>
        <View style={styles.content}>
          <EmptyState message={t('entry.missing')} />
        </View>
      </View>
    );
  }

  const typed = gramsText ?? (entry.grams === null ? '' : formatDecimal(entry.grams));
  const grams = entry.grams === null ? null : parseDecimal(typed);
  const validGrams = grams !== null && grams > 0 && grams <= NEW_FOOD_LIMITS.portionGramsMax;
  const meal = mealType ?? entry.mealType;
  const values = grams !== null && validGrams ? scaleEntry(entry, grams) : entry;
  const changed =
    (entry.grams !== null && validGrams && grams !== entry.grams) || meal !== entry.mealType;

  function save() {
    if (!entry) return;
    if (entry.grams !== null && !validGrams) {
      setError('invalidQuantity');
      return;
    }
    try {
      updateEntry(localDb, userId, entry.id, {
        ...(grams !== null && validGrams ? { grams } : {}),
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
    <View style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {entry.grams === null ? null : (
          <TextField
            label={t('entry.quantity')}
            value={typed}
            onChangeText={(text) => {
              setGramsText(text);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder={formatGrams(entry.grams)}
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
          <Text
            variant="label"
            weight={500}
            color="danger"
            align="center"
            accessibilityRole="alert"
          >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[12],
    paddingHorizontal: space.screen,
    paddingTop: space[24],
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
  content: { padding: space.screen, gap: space[20] },
  meals: { gap: space[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
