import {
  MEAL_TYPES,
  mealForTime,
  type MealType,
  parseDecimal,
  quickEntrySchema,
} from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../auth';
import { localDb } from '../db';
import { addQuickEntry } from '../journal';
import { Sentry } from '../lib/sentry';
import { colors, type ColorToken, radius, space, touch } from '../theme/tokens';
import { Card, Chip, NutrientField, PrimaryButton, Text, TextField } from '../ui';

type Field = 'kcal' | 'proteinG' | 'carbsG' | 'fatG';

const ROWS: { key: Field; dot: ColorToken }[][] = [
  [
    { key: 'kcal', dot: 'text' },
    { key: 'proteinG', dot: 'protein' },
  ],
  [
    { key: 'carbsG', dot: 'carbs' },
    { key: 'fatG', dot: 'fat' },
  ],
];

const MACRO_KEYS = { proteinG: 'protein', carbsG: 'carbs', fatG: 'fat' } as const;

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((meal) => meal === value);
}

/** An empty optional macro counts as 0; anything else must be a number. */
function macro(text: string): number | null {
  return text.trim() === '' ? 0 : parseDecimal(text);
}

// Quick add (no mockup): calories, optional macros and a name, without choosing a food.
export default function QuickAddSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ meal?: string }>();
  const userId = useSessionUserId() ?? '';
  const [meal, setMeal] = useState<MealType>(() =>
    isMealType(params.meal) ? params.meal : mealForTime(new Date()),
  );
  const [label, setLabel] = useState('');
  const [values, setValues] = useState<Record<Field, string>>({
    kcal: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
  });
  const [error, setError] = useState<'invalid' | 'error' | null>(null);

  function save() {
    const result = quickEntrySchema.safeParse({
      label,
      kcal: parseDecimal(values.kcal),
      proteinG: macro(values.proteinG),
      carbsG: macro(values.carbsG),
      fatG: macro(values.fatG),
    });
    if (!result.success) {
      setError('invalid');
      return;
    }
    try {
      addQuickEntry(localDb, userId, {
        mealType: meal,
        entry: result.data,
        label: t('quickAdd.defaultLabel'),
        at: new Date(),
      });
    } catch (saveError) {
      Sentry.captureException(saveError);
      setError('error');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  const savable = values.kcal.trim() !== '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t('quickAdd.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quickAdd.close')}
          onPress={() => {
            router.back();
          }}
          style={styles.close}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      <TextField
        label={t('quickAdd.name')}
        placeholder={t('quickAdd.namePlaceholder')}
        value={label}
        onChangeText={(text) => {
          setLabel(text);
          setError(null);
        }}
      />

      <Card style={styles.card}>
        {ROWS.map((row) => (
          <View key={row[0]?.key} style={styles.row}>
            {row.map(({ key, dot }) => {
              const unit = key === 'kcal' ? t('food.new.kcalUnit') : t('food.new.gramUnit');
              const name = key === 'kcal' ? t('food.new.kcal') : t(`macros.${MACRO_KEYS[key]}`);
              return (
                <NutrientField
                  key={key}
                  label={name}
                  dot={dot}
                  unit={unit}
                  accessibilityLabel={t('quickAdd.fieldLabel', { nutrient: name, unit })}
                  value={values[key]}
                  onChangeText={(text) => {
                    setValues((current) => ({ ...current, [key]: text }));
                    setError(null);
                  }}
                  invalid={error === 'invalid' && (key === 'kcal' || macro(values[key]) === null)}
                />
              );
            })}
          </View>
        ))}
        <Text variant="caption" color="textMuted">
          {t('quickAdd.macrosOptional')}
        </Text>
      </Card>

      <View style={styles.meals}>
        <Text variant="caption" weight={600} color="textMuted">
          {t('quickAdd.meal')}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('quickAdd.meal')}
          style={styles.chips}
        >
          {MEAL_TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`add.mealShort.${type}`)}
              accessibilityLabel={t(`meals.${type}`)}
              selected={meal === type}
              onPress={() => {
                setMeal(type);
              }}
            />
          ))}
        </View>
      </View>

      {error ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t(`quickAdd.${error}`)}
        </Text>
      ) : null}

      <PrimaryButton
        label={t('quickAdd.save')}
        disabled={!savable}
        onPress={save}
        {...(savable ? {} : { accessibilityHint: t('quickAdd.saveHint') })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[24],
    paddingBottom: space.screen,
    gap: space[20],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  title: { flex: 1 },
  close: {
    width: touch.minSize + space[8],
    height: touch.minSize + space[8],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: space[16] },
  row: { flexDirection: 'row', gap: space[12] },
  meals: { gap: space[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
