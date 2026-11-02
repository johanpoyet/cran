import {
  type Food,
  formatDecimal,
  formatGrams,
  formatKcal,
  MEAL_TYPES,
  mealForTime,
  type MealType,
  nutritionFor,
} from '@cran/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
import { addEntries } from '../journal';
import { Sentry } from '../lib/sentry';
import { colors, radius, space, touch } from '../theme/tokens';
import {
  Chip,
  EmptyState,
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

// "Ajouter un aliment": meal, search (phone then server), recent and favourite foods, multiple
// selection and total. A recent food is added in three touches: +, its + and "Ajouter".
export default function AddSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ meal?: string }>();
  const userId = useSessionUserId() ?? '';
  const [meal, setMeal] = useState<MealType>(() =>
    isMealType(params.meal) ? params.meal : mealForTime(new Date()),
  );
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [selection, setSelection] = useState<Map<string, { food: Food; grams: number }>>(
    () => new Map(),
  );
  const [error, setError] = useState(false);

  const recents = useLocalQuery(
    useCallback(() => readRecentFoods(localDb, userId, RECENT_LIMIT), [userId]),
  );
  const favorites = useLocalQuery(useCallback(() => readFavoriteFoods(localDb, userId), [userId]));
  const lastGrams = useLocalQuery(useCallback(() => readLastGrams(localDb, userId), [userId]));
  const search = useFoodSearch(localDb, userId, query);

  const searching = query.trim() !== '';
  const listed = searching
    ? search.foods.map((food) => ({ food, lastGrams: lastGrams.get(food.id) ?? null }))
    : tab === 'recent'
      ? recents
      : favorites;

  function toggle(food: Food, last: number | null) {
    setError(false);
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(food.id)) next.delete(food.id);
      else next.set(food.id, { food, grams: defaultGrams(food, last) });
      return next;
    });
  }

  function add() {
    try {
      addEntries(localDb, userId, {
        mealType: meal,
        items: [...selection.values()],
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

  function createFood() {
    router.back();
    router.push(
      searching ? { pathname: '/food/new', params: { name: query.trim() } } : '/food/new',
    );
  }

  const totalKcal = [...selection.values()].reduce(
    (total, { food, grams }) => total + nutritionFor(food, grams).kcal,
    0,
  );

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
          <Segmented
            options={[
              { value: 'recent', label: t('add.recent') },
              { value: 'favorites', label: t('add.favorites') },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}

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
                    quantity: formatGrams(selected.grams),
                    quantityLabel: t('add.quantity', {
                      name: food.name,
                      grams: formatGrams(selected.grams),
                    }),
                  }
                : {})}
              toggleLabel={t('add.select', { name: food.name })}
              onToggle={() => {
                toggle(food, last);
              }}
            />
          );
        })}

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
        {searching && search.status === 'done' && listed.length === 0 ? (
          <EmptyState message={t('add.noResult', { query: query.trim() })} />
        ) : null}
        {!searching && listed.length === 0 ? (
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
      {selection.size > 0 ? (
        <SelectionBar
          label={t('add.selected', { count: selection.size })}
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
});
