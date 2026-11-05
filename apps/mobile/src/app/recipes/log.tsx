import {
  formatDecimal,
  formatGrams,
  formatKcal,
  MEAL_TYPES,
  mealForTime,
  type MealType,
  parseDecimal,
  RECIPE_LIMITS,
  type RecipeAmount,
  recipePortion,
} from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { type ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { addEntries, useAddSelection } from '../../journal';
import { Sentry } from '../../lib/sentry';
import { readRecipe, type RecipeDetail, servingsLabel } from '../../recipes';
import { colors, radius, space, touch } from '../../theme/tokens';
import { Chip, EmptyState, MenuButton, PrimaryButton, Text, TextField, ValueTile } from '../../ui';

/** 1 or 2 servings, servings typed by hand, or a weighed portion of the cooked dish. */
type Choice = 1 | 2 | 'other' | 'weigh';

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((meal) => meal === value);
}

/** Choice and typed text matching an amount already selected in the add sheet. */
function initialChoice(amount: RecipeAmount | undefined, weigh: boolean): [Choice, string] {
  if (!amount) return [weigh ? 'weigh' : 1, ''];
  if ('grams' in amount) return ['weigh', formatDecimal(amount.grams)];
  if (amount.servings === 1 || amount.servings === 2) return [amount.servings, ''];
  return ['other', formatDecimal(amount.servings)];
}

// "Ajouter au journal" for a recipe (no mockup, laid out as the product sheet of the scan): 1 or
// 2 servings, servings typed, or a weighed portion when the cooked weight is known; the meal of the
// hour, changeable. `?select=1`: opened from the add sheet, it changes the recipe selected there.
export default function RecipeLogSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    weigh?: string;
    select?: string;
    meal?: string;
  }>();
  const userId = useSessionUserId() ?? '';
  const recipe = useLocalQuery(
    useCallback(() => readRecipe(localDb, userId, params.id), [userId, params.id]),
  );

  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('recipes.log.close')}
      onPress={() => {
        router.back();
      }}
      style={styles.close}
    >
      <X size={22} color={colors.text} />
    </Pressable>
  );

  if (!recipe) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.title} />
          {close}
        </View>
        <EmptyState message={t('recipes.missing')} />
      </ScrollView>
    );
  }

  return (
    <LogForm
      recipe={recipe}
      close={close}
      weigh={params.weigh === '1'}
      select={params.select === '1'}
      meal={isMealType(params.meal) ? params.meal : mealForTime(new Date())}
    />
  );
}

function LogForm({
  recipe,
  close,
  weigh,
  select,
  meal: initialMeal,
}: {
  recipe: RecipeDetail;
  close: ReactNode;
  weigh: boolean;
  select: boolean;
  meal: MealType;
}) {
  const { t } = useTranslation();
  const userId = useSessionUserId() ?? '';
  const selected = useAddSelection((state) => state.recipes.get(recipe.id));
  const canWeigh = recipe.servingWeightG !== null;
  const [initial, initialText] = initialChoice(selected?.amount, weigh && canWeigh);
  const [choice, setChoice] = useState<Choice>(initial);
  const [typed, setTyped] = useState(initialText);
  const [meal, setMeal] = useState(initialMeal);
  const [error, setError] = useState(false);

  const number = parseDecimal(typed);
  const amount: RecipeAmount | null =
    choice === 1 || choice === 2
      ? { servings: choice }
      : choice === 'other'
        ? number !== null && number > 0 && number <= RECIPE_LIMITS.loggedServingsMax
          ? { servings: number }
          : null
        : number !== null && number > 0 && number <= RECIPE_LIMITS.portionGramsMax
          ? { grams: number }
          : null;
  const portion = amount ? recipePortion(recipe, amount) : null;
  const values = portion?.values ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const kcal = formatKcal(Math.round(values.kcal));

  function pick(next: Choice) {
    setChoice(next);
    setTyped('');
    setError(false);
  }

  function confirm() {
    if (!amount || !portion) return;
    if (select) {
      useAddSelection.getState().selectRecipe({ recipe, amount });
      router.back();
      return;
    }
    try {
      addEntries(localDb, userId, {
        mealType: meal,
        items: [{ recipe, amount }],
        at: new Date(),
      });
    } catch (addError) {
      Sentry.captureException(addError);
      setError(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Back to Today, past the recipe screens.
    router.dismissTo('/');
  }

  const perServing = t('recipes.log.perServing', {
    kcal: formatKcal(Math.round(recipe.perServing.kcal)),
  });
  const macro = (name: 'protein' | 'carbs' | 'fat', grams: number) =>
    t('recipes.log.macro', { name: t(`recipes.${name}`), grams: formatDecimal(grams) });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <Text variant="title" accessibilityRole="header">
            {recipe.name}
          </Text>
          <Text color="textMuted">
            {recipe.servingWeightG === null
              ? perServing
              : t('recipes.log.perServingWeight', {
                  values: perServing,
                  grams: formatGrams(Math.round(recipe.servingWeightG)),
                })}
          </Text>
        </View>
        {close}
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('recipes.log.quantity')}
        style={styles.chips}
      >
        {([1, 2] as const).map((count) => (
          <Chip
            key={count}
            label={servingsLabel(t, count)}
            selected={choice === count}
            onPress={() => {
              pick(count);
            }}
          />
        ))}
        <Chip
          label={t('recipes.log.other')}
          selected={choice === 'other'}
          onPress={() => {
            pick('other');
          }}
        />
        {canWeigh ? (
          <Chip
            label={t('recipes.log.weigh')}
            selected={choice === 'weigh'}
            onPress={() => {
              pick('weigh');
            }}
          />
        ) : null}
      </View>

      {choice === 'other' ? (
        <TextField
          label={t('recipes.log.servings')}
          value={typed}
          onChangeText={setTyped}
          keyboardType="decimal-pad"
          autoFocus
        />
      ) : null}
      {choice === 'weigh' ? (
        <TextField
          label={t('recipes.log.grams')}
          value={typed}
          onChangeText={setTyped}
          keyboardType="decimal-pad"
          autoFocus
        />
      ) : null}
      {(choice === 'other' || choice === 'weigh') && typed.trim() !== '' && !amount ? (
        <Text variant="label" weight={500} color="danger" accessibilityRole="alert">
          {t(choice === 'other' ? 'recipes.log.invalidServings' : 'recipes.log.invalidGrams')}
        </Text>
      ) : null}

      <View style={styles.values} accessibilityLiveRegion="polite">
        <ValueTile
          value={formatDecimal(Math.round(values.kcal))}
          label={t('recipes.kcal')}
          accessibilityLabel={kcal}
        />
        <ValueTile
          value={formatGrams(Math.round(values.proteinG))}
          label={t('recipes.protein')}
          accessibilityLabel={macro('protein', values.proteinG)}
        />
        <ValueTile
          value={formatGrams(Math.round(values.carbsG))}
          label={t('recipes.carbs')}
          accessibilityLabel={macro('carbs', values.carbsG)}
        />
        <ValueTile
          value={formatGrams(Math.round(values.fatG))}
          label={t('recipes.fat')}
          accessibilityLabel={macro('fat', values.fatG)}
        />
      </View>

      {select ? null : (
        <View style={styles.meal}>
          <Text variant="lead" weight={400} color="textMuted">
            {t('recipes.log.addTo')}
          </Text>
          <MenuButton
            value={meal}
            options={MEAL_TYPES.map((type) => ({ value: type, label: t(`add.mealShort.${type}`) }))}
            onChange={setMeal}
            accessibilityLabel={t('recipes.log.addTo')}
            cancelLabel={t('recipes.log.cancel')}
          />
        </View>
      )}

      {error ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t('add.error')}
        </Text>
      ) : null}

      <PrimaryButton
        label={select ? t('recipes.log.confirm') : t('recipes.log.add', { kcal })}
        disabled={!portion}
        onPress={confirm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.screen, gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  title: { flex: 1, gap: space[4] },
  close: {
    width: touch.minSize,
    height: touch.minSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  values: { flexDirection: 'row', gap: space[8] },
  meal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
