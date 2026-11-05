import {
  type Food,
  formatDecimal,
  formatGrams,
  formatInteger,
  formatKcal,
  MEAL_TYPES,
  mealForTime,
  type MealType,
  nutritionFor,
  recipePortion,
} from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionUserId } from '../auth';
import { localDb, useLocalQuery } from '../db';
import {
  defaultGrams,
  readFavoriteFoods,
  readLastGrams,
  readRecentFoods,
  useFoodSearch,
} from '../foods';
import {
  addEntries,
  copyEntries,
  readMealEntries,
  useAddSelection,
  yesterdayKey,
} from '../journal';
import { Sentry } from '../lib/sentry';
import {
  readRecentRecipes,
  readRecipes,
  type RecipeDetail,
  searchRecipes,
  servingsLabel,
} from '../recipes';
import { colors, radius, space, touch } from '../theme/tokens';
import {
  Chip,
  EmptyState,
  EntryRow,
  FoodRow,
  LinkButton,
  SearchField,
  Segmented,
  SelectionBar,
  Text,
} from '../ui';

type Tab = 'recent' | 'favorites';
const RECENT_LIMIT = 20;

function isMealType(value: string | undefined): value is MealType {
  return MEAL_TYPES.some((meal) => meal === value);
}

// "Ajouter un aliment": meal, search (phone then server), recent and favourite foods, the user's
// recipes (in the search and the recent ones, S6-2), multiple selection and total. A recent food is
// added in three touches: +, its + and "Ajouter".
export default function AddSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ meal?: string }>();
  const userId = useSessionUserId() ?? '';
  const [meal, setMeal] = useState<MealType>(() =>
    isMealType(params.meal) ? params.meal : mealForTime(new Date()),
  );
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const selection = useAddSelection((state) => state.selected);
  const recipeSelection = useAddSelection((state) => state.recipes);
  const { show, select, unselect, selectRecipe, unselectRecipe, clear } =
    useAddSelection.getState();
  const [error, setError] = useState(false);

  const recents = useLocalQuery(
    useCallback(() => readRecentFoods(localDb, userId, RECENT_LIMIT), [userId]),
  );
  const favorites = useLocalQuery(useCallback(() => readFavoriteFoods(localDb, userId), [userId]));
  const lastGrams = useLocalQuery(useCallback(() => readLastGrams(localDb, userId), [userId]));
  const [today] = useState(() => new Date());
  const yesterday = useLocalQuery(
    useCallback(
      () => readMealEntries(localDb, userId, yesterdayKey(today), meal),
      [userId, today, meal],
    ),
  );
  const search = useFoodSearch(localDb, userId, query);
  const recipes = useLocalQuery(useCallback(() => readRecipes(localDb, userId), [userId]));
  const recentRecipes = useLocalQuery(
    useCallback(() => readRecentRecipes(localDb, userId, RECENT_LIMIT), [userId]),
  );

  // The selection lives as long as the sheet.
  useEffect(() => clear, [clear]);

  const searching = query.trim() !== '';
  const listed = searching
    ? search.foods.map((food) => ({ food, lastGrams: lastGrams.get(food.id) ?? null }))
    : tab === 'recent'
      ? recents
      : favorites;
  // Recent recipes come first: a meal prep is logged day after day. Favourite recipes: S6-4.
  const listedRecipes = searching
    ? searchRecipes(recipes, query)
    : tab === 'recent'
      ? recentRecipes
      : [];

  // The quantity sheet reads the foods shown here (server results included).
  useEffect(() => {
    show(listed.map(({ food }) => food));
  }, [listed, show]);

  function toggle(food: Food, last: number | null) {
    setError(false);
    if (selection.has(food.id)) unselect(food.id);
    else select({ food, grams: defaultGrams(food, last), portionLabel: null });
  }

  function toggleRecipe(recipe: RecipeDetail) {
    setError(false);
    if (recipeSelection.has(recipe.id)) unselectRecipe(recipe.id);
    else selectRecipe({ recipe, amount: { servings: 1 } });
  }

  function openRecipe(recipe: RecipeDetail) {
    router.push({ pathname: '/recipes/log', params: { id: recipe.id, select: '1' } });
  }

  function openQuantity(food: Food) {
    router.push({ pathname: '/food/[id]', params: { id: food.id } });
  }

  function add() {
    try {
      addEntries(localDb, userId, {
        mealType: meal,
        items: [...selection.values(), ...recipeSelection.values()],
        at: new Date(),
      });
    } catch (addError) {
      Sentry.captureException(addError);
      setError(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  function copyYesterday() {
    try {
      copyEntries(localDb, userId, yesterday, { mealType: meal, at: new Date() });
    } catch (copyError) {
      Sentry.captureException(copyError);
      setError(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  function quickAdd() {
    // Replaces the sheet: saving the quick add goes back to Today.
    router.replace({ pathname: '/quick-add', params: { meal } });
  }

  function createFood() {
    router.back();
    router.push(
      searching ? { pathname: '/food/new', params: { name: query.trim() } } : '/food/new',
    );
  }

  const yesterdayKcal = yesterday.reduce((total, entry) => total + entry.kcal, 0);
  const totalKcal =
    [...selection.values()].reduce(
      (total, { food, grams }) => total + nutritionFor(food, grams).kcal,
      0,
    ) +
    [...recipeSelection.values()].reduce(
      (total, { recipe, amount }) => total + (recipePortion(recipe, amount)?.values.kcal ?? 0),
      0,
    );
  const selectedCount = selection.size + recipeSelection.size;

  const recipeRows = listedRecipes.map((recipe) => {
    const selected = recipeSelection.get(recipe.id);
    const quantity = selected
      ? 'servings' in selected.amount
        ? servingsLabel(t, selected.amount.servings)
        : formatGrams(selected.amount.grams)
      : null;
    return (
      <FoodRow
        key={recipe.id}
        name={recipe.name}
        details={t('add.recipeDetails', {
          kcal: formatKcal(Math.round(recipe.perServing.kcal)),
        })}
        selected={selected !== undefined}
        {...(quantity
          ? { quantity, quantityLabel: t('add.quantity', { name: recipe.name, grams: quantity }) }
          : {})}
        toggleLabel={t('add.select', { name: recipe.name })}
        onToggle={() => {
          toggleRecipe(recipe);
        }}
        openLabel={t('add.open', { name: recipe.name })}
        onOpen={() => {
          openRecipe(recipe);
        }}
      />
    );
  });

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.top}>
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('add.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('add.close')}
            onPress={() => {
              router.back();
            }}
            style={styles.close}
          >
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('add.meal')}
          style={styles.meals}
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

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('add.searchPlaceholder')}
          accessibilityLabel={t('add.search')}
          clearLabel={t('add.clearSearch')}
          onClear={() => {
            setQuery('');
          }}
          scan={{
            label: t('add.scan'),
            onPress: () => {
              router.push({ pathname: '/scan', params: { meal } });
            },
          }}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {searching ? (
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t('add.results', { query: query.trim() })}
          </Text>
        ) : (
          <View style={styles.shortcuts}>
            {yesterday.length > 0 ? (
              <EntryRow
                title={t(`add.copyYesterday.${meal}`)}
                details={t('add.copySummary', { count: yesterday.length })}
                value={formatInteger(Math.round(yesterdayKcal))}
                accessibilityLabel={t('add.copyLabel', {
                  action: t(`add.copyYesterday.${meal}`),
                  summary: t('add.copySummary', { count: yesterday.length }),
                  kcal: formatKcal(Math.round(yesterdayKcal)),
                })}
                accessibilityHint={t('add.copyHint')}
                onPress={copyYesterday}
              />
            ) : null}
            <View style={styles.quickAdd}>
              <Chip
                label={t('add.quickAdd')}
                icon={Zap}
                accessibilityHint={t('add.quickAddHint')}
                onPress={quickAdd}
              />
            </View>
          </View>
        )}
        {searching ? null : (
          <Segmented
            options={[
              { value: 'recent', label: t('add.recent') },
              { value: 'favorites', label: t('add.favorites') },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}

        {searching ? null : recipeRows}
        {listed.map(({ food, lastGrams: last }) => {
          const selected = selection.get(food.id);
          const values = t('add.per100g', {
            kcal: formatKcal(Math.round(food.kcal100g)),
            protein: formatDecimal(food.protein100g),
            carbs: formatDecimal(food.carbs100g),
          });
          return (
            <FoodRow
              key={food.id}
              name={food.name}
              details={food.brand ? t('add.withBrand', { brand: food.brand, values }) : values}
              selected={selected !== undefined}
              {...(selected
                ? {
                    quantity: selected.portionLabel ?? formatGrams(selected.grams),
                    quantityLabel: t('add.quantity', {
                      name: food.name,
                      grams: selected.portionLabel ?? formatGrams(selected.grams),
                    }),
                  }
                : {})}
              toggleLabel={t('add.select', { name: food.name })}
              onToggle={() => {
                toggle(food, last);
              }}
              openLabel={t('add.open', { name: food.name })}
              onOpen={() => {
                openQuantity(food);
              }}
            />
          );
        })}

        {searching ? recipeRows : null}

        {searching && search.status === 'loading' ? (
          <Text variant="caption" color="textMuted">
            {t('add.searching')}
          </Text>
        ) : null}
        {searching && search.status === 'offline' ? (
          <Text variant="caption" color="textMuted">
            {t('add.offline')}
          </Text>
        ) : null}
        {searching &&
        search.status === 'done' &&
        listed.length === 0 &&
        listedRecipes.length === 0 ? (
          <EmptyState message={t('add.noResult', { query: query.trim() })} />
        ) : null}
        {!searching && listed.length === 0 && listedRecipes.length === 0 ? (
          <EmptyState message={tab === 'recent' ? t('add.recentEmpty') : t('add.favoritesEmpty')} />
        ) : null}

        <LinkButton
          label={searching ? t('add.createNamed', { query: query.trim() }) : t('add.createFood')}
          onPress={createFood}
        />
      </ScrollView>

      {error ? (
        <Text variant="label" weight={500} color="danger" align="center" accessibilityRole="alert">
          {t('add.error')}
        </Text>
      ) : null}
      {selectedCount > 0 ? (
        <SelectionBar
          label={t('add.selected', { count: selectedCount })}
          total={t('add.total', { kcal: formatKcal(Math.round(totalKcal)) })}
          action={t('add.action')}
          onAction={add}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { paddingHorizontal: space.screen, paddingTop: space[24], gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: touch.minSize + space[8],
    height: touch.minSize + space[8],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  list: { flex: 1 },
  listContent: { padding: space.screen, gap: space[4] },
  shortcuts: { gap: space[8], marginBottom: space[8] },
  quickAdd: { flexDirection: 'row' },
});
