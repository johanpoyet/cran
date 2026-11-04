import { formatGrams, RECIPE_CATEGORIES, RECIPE_LIMITS } from '@cran/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb } from '../../db';
import { Sentry } from '../../lib/sentry';
import {
  deleteRecipe,
  type RecipeDraftError,
  saveRecipe,
  useRecipeDraft,
  validateDraft,
} from '../../recipes';
import { space } from '../../theme/tokens';
import {
  Card,
  Chip,
  IngredientRow,
  LinkButton,
  Overline,
  StepHeader,
  Stepper,
  StepScreen,
  Text,
  TextField,
} from '../../ui';

type SaveError = RecipeDraftError | 'save';

// "Nouvelle recette" / "Modifier la recette" (no mockup): name, category, servings, ingredients
// weighed for the whole recipe, cooked weight, notes. Saved in the local database; the ingredient
// sheet (`recipes/ingredient`) adds or changes an ingredient of the draft.
export default function RecipeFormScreen() {
  const { t } = useTranslation();
  const userId = useSessionUserId();
  const draft = useRecipeDraft((state) => state.draft);
  const update = useRecipeDraft((state) => state.update);
  const [error, setError] = useState<SaveError | null>(null);
  const savable = draft.name.trim() !== '' && draft.ingredients.length > 0;

  function change(changes: Parameters<typeof update>[0]) {
    update(changes);
    setError(null);
  }

  function openIngredient(index?: number) {
    setError(null);
    router.push(
      index === undefined
        ? '/recipes/ingredient'
        : { pathname: '/recipes/ingredient', params: { index: String(index) } },
    );
  }

  function save() {
    if (userId === null) return;
    const result = validateDraft(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      const foods = draft.ingredients.map((ingredient) => ingredient.food);
      const id = saveRecipe(localDb, userId, result.recipe, foods, draft.id ?? undefined);
      if (draft.id) router.back();
      else router.replace({ pathname: '/recipes/[id]', params: { id } });
    } catch (saveError) {
      Sentry.captureException(saveError);
      setError('save');
    }
  }

  function confirmDelete() {
    const { id } = draft;
    if (userId === null || id === null) return;
    Alert.alert(t('recipes.form.deleteTitle', { name: draft.name }), t('recipes.form.deleteText'), [
      { text: t('recipes.form.cancel'), style: 'cancel' },
      {
        text: t('recipes.form.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          deleteRecipe(localDb, userId, id);
          router.dismissTo('/recipes');
        },
      },
    ]);
  }

  return (
    <StepScreen
      header={
        <StepHeader
          backLabel={t('recipes.back')}
          onBack={() => {
            router.back();
          }}
          title={t(draft.id ? 'recipes.form.titleEdit' : 'recipes.form.titleNew')}
        />
      }
      action={{
        label: t('recipes.form.save'),
        disabled: !savable,
        onPress: save,
        ...(savable ? {} : { accessibilityHint: t('recipes.form.saveHint') }),
      }}
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
                {t(`recipes.form.errors.${error}`)}
              </Text>
            ),
          }
        : {})}
    >
      <Card style={styles.card}>
        <TextField
          label={t('recipes.form.name')}
          placeholder={t('recipes.form.namePlaceholder')}
          value={draft.name}
          onChangeText={(name) => {
            change({ name });
          }}
          autoCapitalize="sentences"
        />
        <Overline>{t('recipes.form.category')}</Overline>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('recipes.form.category')}
          style={styles.chips}
        >
          {RECIPE_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={t(`recipes.categories.${category}`)}
              selected={draft.category === category}
              onPress={() => {
                // Touching the chosen category again leaves the recipe without one.
                change({ category: draft.category === category ? null : category });
              }}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Stepper
          value={draft.servings}
          min={RECIPE_LIMITS.servingsMin}
          max={RECIPE_LIMITS.servingsMax}
          onChange={(servings) => {
            change({ servings });
          }}
          label={t('recipes.form.servings')}
          caption={t('recipes.form.servings')}
          decrementLabel={t('recipes.fewer')}
          incrementLabel={t('recipes.more')}
        />
      </Card>

      <Card style={styles.card}>
        <Overline>{t('recipes.form.ingredients')}</Overline>
        {draft.ingredients.length === 0 ? (
          <Text variant="label" weight={500} color="textMuted">
            {t('recipes.form.noIngredient')}
          </Text>
        ) : null}
        <View>
          {draft.ingredients.map((ingredient, index) => {
            const quantity = formatGrams(ingredient.grams);
            return (
              <IngredientRow
                key={`${ingredient.food.id}-${String(index)}`}
                name={ingredient.food.name}
                details={ingredient.food.brand ?? ''}
                quantity={quantity}
                {...(ingredient.isRaw ? { rawLabel: t('recipes.raw') } : {})}
                separator={index > 0}
                onPress={() => {
                  openIngredient(index);
                }}
                accessibilityLabel={t('recipes.ingredientLabel', {
                  name: ingredient.food.name,
                  grams: ingredient.isRaw ? `${quantity} ${t('recipes.rawSpoken')}` : quantity,
                  details: t('recipes.ingredient.titleEdit'),
                })}
              />
            );
          })}
        </View>
        <Chip
          variant="dashed"
          label={t('recipes.form.addIngredient')}
          onPress={() => {
            openIngredient();
          }}
        />
      </Card>

      <Card style={styles.card}>
        <TextField
          label={t('recipes.form.cookedWeight')}
          placeholder={t('recipes.form.cookedPlaceholder')}
          value={draft.cookedWeight}
          onChangeText={(cookedWeight) => {
            change({ cookedWeight });
          }}
          keyboardType="decimal-pad"
        />
        <TextField
          label={t('recipes.form.notes')}
          placeholder={t('recipes.form.notesPlaceholder')}
          value={draft.notes}
          onChangeText={(notes) => {
            change({ notes });
          }}
          multiline
        />
      </Card>

      {draft.id ? (
        <LinkButton tone="danger" label={t('recipes.form.delete')} onPress={confirmDelete} />
      ) : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
