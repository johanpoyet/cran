import { type Food, formatDecimal, formatKcal, parseDecimal, RECIPE_LIMITS } from '@cran/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { readRecentFoods, useFoodSearch } from '../../foods';
import { useRecipeDraft } from '../../recipes';
import { colors, radius, space, touch } from '../../theme/tokens';
import {
  IngredientRow,
  LinkButton,
  PrimaryButton,
  SearchField,
  SwitchRow,
  Text,
  TextField,
} from '../../ui';

const RECENT_LIMIT = 20;

// Ingredient of the recipe being edited (no mockup): pick a food (search, or the recent ones),
// then its weight for the whole recipe and whether it was weighed raw. `?index=` edits an
// ingredient of the draft.
export default function IngredientSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ index?: string }>();
  const index = params.index === undefined ? null : Number(params.index);
  const existing = useRecipeDraft((state) =>
    index === null ? undefined : state.draft.ingredients[index],
  );
  const [food, setFood] = useState<Food | null>(existing?.food ?? null);
  const [typed, setTyped] = useState(existing ? formatDecimal(existing.grams) : '');
  const [isRaw, setIsRaw] = useState(existing?.isRaw ?? true);
  const [invalid, setInvalid] = useState(false);

  function confirm() {
    const grams = parseDecimal(typed);
    if (!food || grams === null || grams <= 0 || grams > RECIPE_LIMITS.ingredientGramsMax) {
      setInvalid(true);
      return;
    }
    useRecipeDraft.getState().setIngredient(index, { food, grams, isRaw });
    router.back();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t(existing ? 'recipes.ingredient.titleEdit' : 'recipes.ingredient.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('recipes.ingredient.close')}
          onPress={() => {
            router.back();
          }}
          style={styles.close}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      {food ? (
        <>
          <View style={styles.food}>
            <Text variant="heading">{food.name}</Text>
            <Text color="textMuted">{per100g(t, food)}</Text>
            <LinkButton
              label={t('recipes.ingredient.change')}
              onPress={() => {
                setFood(null);
              }}
            />
          </View>
          <TextField
            label={t('recipes.ingredient.grams')}
            value={typed}
            onChangeText={(text) => {
              setTyped(text);
              setInvalid(false);
            }}
            keyboardType="decimal-pad"
            autoFocus={!existing}
          />
          <SwitchRow
            title={t('recipes.ingredient.raw')}
            subtitle={t('recipes.ingredient.rawHint')}
            value={isRaw}
            onValueChange={setIsRaw}
          />
          {invalid ? (
            <Text variant="label" weight={500} color="danger" accessibilityRole="alert">
              {t('recipes.ingredient.invalid')}
            </Text>
          ) : null}
          <PrimaryButton
            label={t(existing ? 'recipes.ingredient.update' : 'recipes.ingredient.add')}
            onPress={confirm}
          />
          {index !== null && existing ? (
            <LinkButton
              tone="danger"
              label={t('recipes.ingredient.remove')}
              onPress={() => {
                useRecipeDraft.getState().removeIngredient(index);
                router.back();
              }}
            />
          ) : null}
        </>
      ) : (
        <FoodPicker onPick={setFood} />
      )}
    </ScrollView>
  );
}

function per100g(t: ReturnType<typeof useTranslation>['t'], food: Food): string {
  const values = t('add.per100g', {
    kcal: formatKcal(Math.round(food.kcal100g)),
    protein: formatDecimal(food.protein100g),
    carbs: formatDecimal(food.carbs100g),
  });
  return food.brand ? t('add.withBrand', { brand: food.brand, values }) : values;
}

/** Search (phone then server) or, without a query, the foods used recently. */
function FoodPicker({ onPick }: { onPick: (food: Food) => void }) {
  const { t } = useTranslation();
  const userId = useSessionUserId() ?? '';
  const [query, setQuery] = useState('');
  const search = useFoodSearch(localDb, userId, query);
  const recents = useLocalQuery(
    useCallback(() => readRecentFoods(localDb, userId, RECENT_LIMIT), [userId]),
  );
  const searching = query.trim() !== '';
  const foods = searching ? search.foods : recents.map(({ food }) => food);

  return (
    <>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('add.searchPlaceholder')}
        accessibilityLabel={t('add.search')}
        clearLabel={t('add.clearSearch')}
        onClear={() => {
          setQuery('');
        }}
        autoFocus
      />
      {searching && search.status === 'offline' ? (
        <Text variant="label" weight={500} color="textMuted">
          {t('add.offline')}
        </Text>
      ) : null}
      {searching && search.status === 'done' && foods.length === 0 ? (
        <Text variant="label" weight={500} color="textMuted">
          {t('add.noResult', { query: query.trim() })}
        </Text>
      ) : null}
      <View>
        {foods.map((food, position) => (
          <IngredientRow
            key={food.id}
            name={food.name}
            details={per100g(t, food)}
            quantity=""
            separator={position > 0}
            onPress={() => {
              onPick(food);
            }}
            accessibilityLabel={t('recipes.ingredient.pick', { name: food.name })}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.screen, gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  title: { flex: 1 },
  close: {
    width: touch.minSize,
    height: touch.minSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  food: { gap: space[4] },
});
