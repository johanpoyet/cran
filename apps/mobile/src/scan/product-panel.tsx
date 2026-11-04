import {
  type FoodDetail,
  formatDecimal,
  formatGrams,
  formatKcal,
  MEAL_TYPES,
  type MealType,
  NEW_FOOD_LIMITS,
  nutritionFor,
  parseDecimal,
} from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../auth';
import { localDb } from '../db';
import { cacheGlobalFood } from '../foods';
import { addEntries } from '../journal';
import { Sentry } from '../lib/sentry';
import { space } from '../theme/tokens';
import {
  BANNER_TONES,
  Chip,
  InfoBanner,
  LetterTile,
  LinkButton,
  MenuButton,
  PrimaryButton,
  Text,
  TextField,
  ValueTile,
} from '../ui';
import { type ProductChoice, productChoices } from './product-choices';

export interface ProductPanelProps {
  detail: FoodDetail;
  /** Meal chosen in the add sheet, or the meal of the hour. */
  meal: MealType;
  /** The keyboard is open: the links are left out to keep "Ajouter" in view. */
  compact?: boolean;
  onRescan: () => void;
}

/** "Nouvel aliment" from the scan: the food keeps the barcode (ADR 0005). */
export function createFromScan(ean: string, from?: string) {
  router.push({ pathname: '/food/new', params: { ean, ...(from ? { from } : {}) } });
}

/** Index of the chosen quantity, or "other" for grams typed by hand. */
type Choice = number | 'other';

// Product sheet of the scan screen (mockup 12): quantity, its values, meal, "Ajouter". The likely
// quantity and the meal are preselected: one touch on "Ajouter" adds the product.
export function ProductPanel({
  detail,
  meal: initialMeal,
  compact = false,
  onRescan,
}: ProductPanelProps) {
  const { t } = useTranslation();
  const userId = useSessionUserId() ?? '';
  const { food } = detail;
  const choices = productChoices(detail);
  const [choice, setChoice] = useState<Choice>(0);
  const [typed, setTyped] = useState('');
  const [meal, setMeal] = useState(initialMeal);
  const [error, setError] = useState(false);

  const picked: ProductChoice | undefined = choice === 'other' ? undefined : choices[choice];
  const typedGrams = parseDecimal(typed);
  const grams = picked ? picked.grams : typedGrams;
  const valid = grams !== null && grams > 0 && grams <= NEW_FOOD_LIMITS.portionGramsMax;
  const values = nutritionFor(food, valid ? grams : 0);

  // Open Food Facts values judged wrong: the user can correct them in a food of their own.
  const doubtful = food.source === 'off' && food.qualityFlag !== 'ok' ? food.qualityFlag : null;
  const ean = food.sourceRef ?? '';

  function correct() {
    // The form reads the product from the phone.
    cacheGlobalFood(localDb, food, new Date());
    createFromScan(ean, food.id);
  }

  function chipLabel(item: ProductChoice): string {
    if (item.kind === 'hundred') return t('quantity.hundred');
    const label = item.kind === 'serving' ? t('quantity.defaultPortion') : item.label;
    return t('quantity.portion', { label, grams: formatGrams(item.grams) });
  }

  function add() {
    if (grams === null || !valid) return;
    const portionLabel =
      picked?.kind === 'serving'
        ? t('quantity.defaultPortion')
        : picked?.kind === 'portion'
          ? picked.label
          : null;
    try {
      addEntries(localDb, userId, {
        mealType: meal,
        items: [{ food, grams, portionLabel }],
        at: new Date(),
      });
    } catch (addError) {
      Sentry.captureException(addError);
      setError(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Back to Today, past the add sheet the scan was opened from.
    router.dismissTo('/');
  }

  return (
    <View style={styles.panel}>
      <View style={styles.product}>
        <LetterTile letter={food.name.charAt(0).toLocaleUpperCase('fr-FR')} />
        <View style={styles.names}>
          <Text variant="heading" weight={800} accessibilityRole="header">
            {food.name}
          </Text>
          {food.brand ? <Text color="textMuted">{food.brand}</Text> : null}
          <Text variant="label" color="success">
            {t(food.source === 'user' ? 'scan.foundOwn' : 'scan.found')}
          </Text>
        </View>
      </View>

      {doubtful && !compact ? (
        <InfoBanner icon={TriangleAlert} tone="warning">
          <Text variant="label" weight={600} color={BANNER_TONES.warning.color}>
            {t(`scan.${doubtful}`)}
          </Text>
          <LinkButton
            label={t('scan.fix')}
            accessibilityHint={t('scan.fixHint')}
            onPress={correct}
          />
        </InfoBanner>
      ) : null}

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('scan.quantity')}
        style={styles.chips}
      >
        {choices.map((item, index) => (
          <Chip
            key={`${item.kind}-${String(index)}`}
            label={chipLabel(item)}
            selected={choice === index}
            onPress={() => {
              setChoice(index);
            }}
          />
        ))}
        <Chip
          label={t('scan.other')}
          selected={choice === 'other'}
          onPress={() => {
            setChoice('other');
          }}
        />
      </View>

      {choice === 'other' ? (
        <TextField
          label={t('quantity.grams')}
          value={typed}
          onChangeText={setTyped}
          keyboardType="decimal-pad"
          autoFocus
        />
      ) : null}

      <View style={styles.values} accessibilityLiveRegion="polite">
        <ValueTile
          value={formatDecimal(Math.round(values.kcal))}
          label={t('scan.kcal')}
          accessibilityLabel={formatKcal(Math.round(values.kcal))}
        />
        <ValueTile
          value={formatDecimal(values.proteinG)}
          label={t('scan.protein')}
          accessibilityLabel={t('scan.macro', {
            name: t('macros.protein'),
            grams: formatDecimal(values.proteinG),
          })}
        />
        <ValueTile
          value={formatDecimal(values.carbsG)}
          label={t('scan.carbs')}
          accessibilityLabel={t('scan.macro', {
            name: t('macros.carbs'),
            grams: formatDecimal(values.carbsG),
          })}
        />
        <ValueTile
          value={formatDecimal(values.fatG)}
          label={t('scan.fat')}
          accessibilityLabel={t('scan.macro', {
            name: t('macros.fat'),
            grams: formatDecimal(values.fatG),
          })}
        />
      </View>

      <View style={styles.meal}>
        <Text variant="lead" weight={400} color="textMuted">
          {t('scan.addTo')}
        </Text>
        <MenuButton
          value={meal}
          options={MEAL_TYPES.map((type) => ({ value: type, label: t(`add.mealShort.${type}`) }))}
          onChange={setMeal}
          accessibilityLabel={t('scan.addTo')}
          cancelLabel={t('scan.cancel')}
        />
      </View>

      {error ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t('add.error')}
        </Text>
      ) : null}

      <PrimaryButton
        label={t('scan.add', { kcal: formatKcal(Math.round(values.kcal)) })}
        disabled={!valid}
        onPress={add}
      />
      {compact ? null : (
        <>
          <LinkButton
            label={t('scan.wrongProduct')}
            onPress={() => {
              createFromScan(ean);
            }}
          />
          <LinkButton label={t('scan.again')} onPress={onRescan} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space[16] },
  product: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  names: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  values: { flexDirection: 'row', gap: space[8] },
  meal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
