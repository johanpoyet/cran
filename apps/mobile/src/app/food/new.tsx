import { formatGrams, formatKcal } from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Star, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb } from '../../db';
import {
  canSave,
  createFood,
  emptyNewFoodForm,
  liveCoherence,
  type NewFoodError,
  type NewFoodForm,
  newFoodFormFrom,
  type NutrientKey,
  parsePortion,
  readFood,
  validateNewFood,
} from '../../foods';
import { Sentry } from '../../lib/sentry';
import type { ColorToken } from '../../theme/tokens';
import { space } from '../../theme/tokens';
import {
  BANNER_TONES,
  Card,
  Chip,
  IconToggle,
  InfoBanner,
  LinkButton,
  NutrientField,
  Overline,
  PrimaryButton,
  StepHeader,
  StepScreen,
  Text,
  TextField,
} from '../../ui';

type SaveError = NewFoodError | 'save';

const NUTRIENT_ROWS: { key: NutrientKey; dot: ColorToken }[][] = [
  [
    { key: 'kcal', dot: 'text' },
    { key: 'protein', dot: 'protein' },
  ],
  [
    { key: 'carbs', dot: 'carbs' },
    { key: 'fat', dot: 'fat' },
  ],
];

// "Nouvel aliment": values per 100 g with a live coherence check, named portions and favourite.
// Saved in the local database. `?name=` prefills the name from a search; from the scan, `?ean=`
// keeps the barcode with the food (ADR 0005) and `?from=` prefills a product to correct.
export default function NewFoodScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ name?: string; ean?: string; from?: string }>();
  const userId = useSessionUserId();
  const [form, setForm] = useState<NewFoodForm>(() => {
    const product = params.from ? readFood(localDb, params.from) : null;
    return product
      ? newFoodFormFrom(product, t('quantity.defaultPortion'))
      : emptyNewFoodForm(params.name ?? '');
  });
  const [portionDraft, setPortionDraft] = useState<{ label: string; grams: string } | null>(null);
  const [error, setError] = useState<{ key: SaveError; field: NutrientKey | 'name' | null } | null>(
    null,
  );

  const coherence = liveCoherence(form);
  const draftPortion = portionDraft ? parsePortion(portionDraft.label, portionDraft.grams) : null;

  function update(changes: Partial<NewFoodForm>) {
    setForm((current) => ({ ...current, ...changes }));
    setError(null);
  }

  function nutrientLabel(key: NutrientKey): string {
    return key === 'kcal' ? t('food.new.kcal') : t(`macros.${key}`);
  }

  function save() {
    if (userId === null) return;
    const result = validateNewFood(form);
    if (!result.ok) {
      setError({ key: result.error, field: result.field });
      return;
    }
    try {
      createFood(localDb, userId, result.food, {
        favorite: form.favorite,
        ...(params.ean ? { barcode: params.ean } : {}),
      });
      router.back();
    } catch (saveError) {
      Sentry.captureException(saveError);
      setError({ key: 'save', field: null });
    }
  }

  function addPortion() {
    if (!draftPortion) return;
    update({ portions: [...form.portions, draftPortion] });
    setPortionDraft(null);
  }

  const savable = canSave(form);

  return (
    <StepScreen
      header={
        <StepHeader
          backLabel={t('food.new.back')}
          onBack={() => {
            router.back();
          }}
          title={t('food.new.title')}
        />
      }
      action={{
        label: t('food.new.save'),
        disabled: !savable,
        onPress: save,
        ...(savable ? {} : { accessibilityHint: t('food.new.saveHint') }),
      }}
      actionAccessory={
        <IconToggle
          icon={Star}
          label={t('food.new.favorite')}
          value={form.favorite}
          onValueChange={(favorite) => {
            update({ favorite });
          }}
          color="protein"
          background="proteinSoft"
        />
      }
      {...(error
        ? {
            footer: (
              <Text
                variant="label"
                weight={500}
                color="danger"
                align="center"
                accessibilityRole="alert"
              >
                {t(`food.new.errors.${error.key}`)}
              </Text>
            ),
          }
        : {})}
    >
      {params.ean ? (
        <Text variant="label" weight={500} color="textMuted">
          {t('food.new.barcode', { ean: params.ean })}
        </Text>
      ) : null}
      <Card style={styles.card}>
        <TextField
          label={t('food.new.name')}
          placeholder={t('food.new.namePlaceholder')}
          value={form.name}
          onChangeText={(name) => {
            update({ name });
          }}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <TextField
          label={t('food.new.brand')}
          placeholder={t('food.new.brandPlaceholder')}
          value={form.brand}
          onChangeText={(brand) => {
            update({ brand });
          }}
          autoCapitalize="words"
        />
      </Card>

      <Card style={styles.card}>
        <Overline>{t('food.new.per100g')}</Overline>
        {NUTRIENT_ROWS.map((row) => (
          <View key={row[0]?.key} style={styles.row}>
            {row.map(({ key, dot }) => {
              const unit = key === 'kcal' ? t('food.new.kcalUnit') : t('food.new.gramUnit');
              return (
                <NutrientField
                  key={key}
                  label={nutrientLabel(key)}
                  dot={dot}
                  unit={unit}
                  accessibilityLabel={t('food.new.fieldLabel', {
                    nutrient: nutrientLabel(key),
                    unit,
                  })}
                  value={form[key]}
                  onChangeText={(value) => {
                    update({ [key]: value });
                  }}
                  invalid={error?.field === key}
                />
              );
            })}
          </View>
        ))}
        {coherence ? (
          <View accessibilityLiveRegion="polite">
            <InfoBanner
              icon={coherence.coherent ? Check : TriangleAlert}
              tone={coherence.coherent ? 'success' : 'warning'}
            >
              <Text
                variant="label"
                weight={600}
                color={BANNER_TONES[coherence.coherent ? 'success' : 'warning'].color}
              >
                {coherence.coherent
                  ? t('food.new.coherent', { kcal: formatKcal(Math.round(coherence.computedKcal)) })
                  : t('food.new.incoherent', {
                      computed: formatKcal(Math.round(coherence.computedKcal)),
                      kcal: formatKcal(Math.round(coherence.kcal)),
                    })}
              </Text>
            </InfoBanner>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Overline>{t('food.new.portions')}</Overline>
        <View style={styles.chips}>
          {form.portions.map((portion, index) => {
            const text = t('food.new.portion', {
              label: portion.label,
              grams: formatGrams(portion.grams),
            });
            return (
              <Chip
                key={`${portion.label}-${String(index)}`}
                label={text}
                variant="soft"
                accessibilityLabel={t('food.new.removePortion', { label: text })}
                accessibilityHint={t('food.new.removePortionHint')}
                onPress={() => {
                  update({ portions: form.portions.filter((_, other) => other !== index) });
                }}
              />
            );
          })}
          {portionDraft ? null : (
            <Chip
              label={t('food.new.addPortion')}
              variant="dashed"
              accessibilityLabel={t('food.new.addPortionLabel')}
              onPress={() => {
                setPortionDraft({ label: '', grams: '' });
              }}
            />
          )}
        </View>
        {portionDraft ? (
          <View style={styles.portionForm}>
            <TextField
              label={t('food.new.portionName')}
              placeholder={t('food.new.portionNamePlaceholder')}
              value={portionDraft.label}
              onChangeText={(label) => {
                setPortionDraft({ ...portionDraft, label });
              }}
              autoFocus
            />
            <TextField
              label={t('food.new.portionGrams')}
              placeholder={t('food.new.portionGramsPlaceholder')}
              value={portionDraft.grams}
              onChangeText={(grams) => {
                setPortionDraft({ ...portionDraft, grams });
              }}
              keyboardType="decimal-pad"
              onSubmitEditing={addPortion}
            />
            <PrimaryButton
              label={t('food.new.confirmPortion')}
              variant="outline"
              disabled={!draftPortion}
              onPress={addPortion}
            />
            <LinkButton
              label={t('food.new.cancelPortion')}
              onPress={() => {
                setPortionDraft(null);
              }}
            />
          </View>
        ) : null}
      </Card>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[16] },
  row: { flexDirection: 'row', gap: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[10] },
  portionForm: { gap: space[12] },
});
