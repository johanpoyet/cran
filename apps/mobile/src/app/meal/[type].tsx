import {
  formatDecimal,
  formatGrams,
  formatInteger,
  formatKcal,
  localDateKey,
  MEAL_TYPES,
  type MealType,
} from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { readMealEntries } from '../../journal';
import { servingsLabel } from '../../recipes';
import { colors, radius, space, touch } from '../../theme/tokens';
import { Card, EmptyState, EntryRow, PrimaryButton, Text } from '../../ui';

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((meal) => meal === value);
}

// A meal of the day (no mockup): its entries, each opening the entry sheet, and "Ajouter".
export default function MealSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type: string; date?: string }>();
  const userId = useSessionUserId() ?? '';
  const mealType = isMealType(params.type) ? params.type : 'breakfast';
  const date = params.date ?? localDateKey(new Date());
  const entries = useLocalQuery(
    useCallback(() => readMealEntries(localDb, userId, date, mealType), [userId, date, mealType]),
  );
  const totalKcal = entries.reduce((total, entry) => total + entry.kcal, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="title" accessibilityRole="header">
            {t(`meals.${mealType}`)}
          </Text>
          {entries.length > 0 ? (
            <Text variant="body" color="textMuted">
              {t('meal.summary', {
                count: entries.length,
                kcal: formatKcal(Math.round(totalKcal)),
              })}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('meal.close')}
          onPress={() => {
            router.back();
          }}
          style={styles.close}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <EmptyState message={t('meal.empty')} />
      ) : (
        <Card style={styles.card}>
          {entries.map((entry, index) => {
            const macros = {
              protein: formatDecimal(entry.proteinG),
              carbs: formatDecimal(entry.carbsG),
              fat: formatDecimal(entry.fatG),
            };
            const details =
              entry.servings !== null
                ? entry.grams === null
                  ? t('meal.entryDetailsServings', {
                      portion: servingsLabel(t, entry.servings),
                      ...macros,
                    })
                  : t('meal.entryDetailsPortion', {
                      portion: servingsLabel(t, entry.servings),
                      grams: formatGrams(Math.round(entry.grams)),
                      ...macros,
                    })
                : entry.grams === null
                  ? t('meal.entryDetailsNoGrams', macros)
                  : t('meal.entryDetails', { grams: formatGrams(entry.grams), ...macros });
            return (
              <EntryRow
                key={entry.id}
                title={entry.label}
                details={details}
                value={formatInteger(Math.round(entry.kcal))}
                separator={index > 0}
                accessibilityLabel={t('meal.entryLabel', {
                  name: entry.label,
                  details,
                  kcal: formatKcal(Math.round(entry.kcal)),
                })}
                accessibilityHint={t('meal.entryHint')}
                onPress={() => {
                  router.push({ pathname: '/entry/[id]', params: { id: entry.id } });
                }}
              />
            );
          })}
        </Card>
      )}
      <PrimaryButton
        label={t('meal.add')}
        variant="outline"
        onPress={() => {
          router.push({ pathname: '/add', params: { meal: mealType } });
        }}
      />
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
    gap: space[16],
  },
  card: { paddingVertical: space[4], backgroundColor: colors.bg },
});
