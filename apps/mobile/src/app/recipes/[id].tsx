import { formatDecimal, formatGrams, formatKcal, parseDecimal, RECIPE_LIMITS } from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import {
  draftFromRecipe,
  ingredientDetails,
  readRecipe,
  type RecipeDetail,
  setRecipeCookedWeight,
  setRecipeServings,
  useRecipeDraft,
} from '../../recipes';
import { colors, control, radius, space } from '../../theme/tokens';
import {
  Card,
  EmptyState,
  HeroCard,
  IngredientRow,
  InlineNumberField,
  ServingsStepper,
  StepHeader,
  Text,
  ValueTile,
} from '../../ui';

// "Fiche recette" (mockup 15): values per serving, servings, ingredients, cooked weight. The number
// of servings and the cooked weight are saved from here (decision of Johan, S6-1); logging a
// serving comes with S6-2.
export default function RecipeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSessionUserId() ?? '';
  const recipe = useLocalQuery(useCallback(() => readRecipe(localDb, userId, id), [userId, id]));

  const back = () => {
    router.back();
  };

  if (!recipe) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.content}>
          <StepHeader backLabel={t('recipes.back')} onBack={back} />
          <EmptyState message={t('recipes.missing')} />
        </View>
      </SafeAreaView>
    );
  }

  const subtitle = [
    recipe.category ? t(`recipes.categories.${recipe.category}`) : null,
    t('recipes.ingredients', { count: recipe.ingredientCount }),
  ]
    .filter((part) => part !== null)
    .join(' · ');

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <StepHeader
          backLabel={t('recipes.back')}
          onBack={back}
          title={recipe.name}
          subtitle={subtitle}
          accessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('recipes.edit')}
              onPress={() => {
                useRecipeDraft.getState().start(draftFromRecipe(recipe));
                router.push({ pathname: '/recipes/edit', params: { id: recipe.id } });
              }}
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}
            >
              <Pencil color={colors.text} size={control.iconSize + 2} />
            </Pressable>
          }
        />
        <PerServing recipe={recipe} userId={userId} />
        <Ingredients recipe={recipe} />
        <CookedWeight key={String(recipe.cookedWeightG)} recipe={recipe} userId={userId} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PerServing({ recipe, userId }: { recipe: RecipeDetail; userId: string }) {
  const { t } = useTranslation();
  const { kcal, proteinG, carbsG, fatG } = recipe.perServing;
  const grams = (value: number) => formatGrams(Math.round(value));
  const tiles = [
    { key: 'protein', value: proteinG },
    { key: 'carbs', value: carbsG },
    { key: 'fat', value: fatG },
  ] as const;
  return (
    <HeroCard style={styles.hero}>
      <View style={styles.heroTop}>
        <Text variant="body" weight={600} color="onAccent">
          {t('recipes.perServing')}
        </Text>
        <ServingsStepper
          value={recipe.servings}
          min={RECIPE_LIMITS.servingsMin}
          max={RECIPE_LIMITS.servingsMax}
          onChange={(servings) => {
            setRecipeServings(localDb, userId, recipe.id, servings);
          }}
          format={(count) => t('recipes.servings', { count })}
          label={t('recipes.servingsLabel')}
          decrementLabel={t('recipes.fewer')}
          incrementLabel={t('recipes.more')}
        />
      </View>
      <View style={styles.tiles} accessibilityLiveRegion="polite">
        <ValueTile
          tone="onAccent"
          value={formatDecimal(Math.round(kcal))}
          label={t('recipes.kcal')}
          accessibilityLabel={t('recipes.kcalLabel', { value: formatKcal(Math.round(kcal)) })}
        />
        {tiles.map(({ key, value }) => (
          <ValueTile
            key={key}
            tone="onAccent"
            value={grams(value)}
            label={t(`recipes.${key}`)}
            accessibilityLabel={t('recipes.valueLabel', {
              value: grams(value),
              name: t(`recipes.${key}`),
            })}
          />
        ))}
      </View>
    </HeroCard>
  );
}

function Ingredients({ recipe }: { recipe: RecipeDetail }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      {recipe.ingredients.map((ingredient, index) => {
        const details = ingredientDetails(t, ingredient.values);
        const quantity = formatGrams(ingredient.grams);
        return (
          <IngredientRow
            key={ingredient.id}
            name={ingredient.food.name}
            details={details}
            quantity={quantity}
            {...(ingredient.isRaw ? { rawLabel: t('recipes.raw') } : {})}
            separator={index > 0}
            accessibilityLabel={t('recipes.ingredientLabel', {
              name: ingredient.food.name,
              grams: ingredient.isRaw ? `${quantity} ${t('recipes.rawSpoken')}` : quantity,
              details,
            })}
          />
        );
      })}
    </Card>
  );
}

/** Saved when the field is left: empty clears it, a wrong value goes back to the saved one. */
function CookedWeight({ recipe, userId }: { recipe: RecipeDetail; userId: string }) {
  const { t } = useTranslation();
  const saved = recipe.cookedWeightG === null ? '' : formatDecimal(recipe.cookedWeightG);
  const [typed, setTyped] = useState(saved);

  function save() {
    const text = typed.trim();
    const grams = text === '' ? null : parseDecimal(text);
    const valid = grams === null || (grams > 0 && grams <= RECIPE_LIMITS.cookedWeightMax);
    if ((text !== '' && grams === null) || !valid) {
      setTyped(saved);
      return;
    }
    if (grams !== recipe.cookedWeightG) setRecipeCookedWeight(localDb, userId, recipe.id, grams);
  }

  return (
    <Card style={styles.cooked}>
      <View style={styles.cookedRow}>
        <Text variant="body" weight={700} style={styles.cookedLabel}>
          {t('recipes.cookedWeight')}
        </Text>
        <InlineNumberField
          value={typed}
          onChangeText={setTyped}
          onEndEditing={save}
          unit="g"
          accessibilityLabel={t('recipes.cookedWeightField')}
        />
      </View>
      <Text variant="label" weight={500} color="textMuted">
        {recipe.servingWeightG === null ? (
          t('recipes.cookedEmpty')
        ) : (
          <Trans
            i18nKey="recipes.servingWeight"
            values={{ grams: formatGrams(Math.round(recipe.servingWeightG)) }}
            components={{ bold: <Text variant="label" weight={800} /> }}
          />
        )}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[8],
    paddingBottom: space[24] * 2,
    gap: space[16],
  },
  round: {
    width: control.round,
    height: control.round,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  hero: { gap: space[16], padding: space[16] },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', gap: space[8] },
  card: { paddingVertical: space[4], paddingHorizontal: space[16] },
  cooked: { gap: space[12] },
  cookedRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  cookedLabel: { flex: 1 },
});
