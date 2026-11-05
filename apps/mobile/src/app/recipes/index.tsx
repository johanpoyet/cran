import { formatDecimal, formatGrams, RECIPE_CATEGORIES, type RecipeCategory } from '@cran/shared';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import {
  emptyDraft,
  readRecipes,
  type RecipeDetail,
  searchRecipes,
  useRecipeDraft,
} from '../../recipes';
import { type ColorToken, space } from '../../theme/tokens';
import {
  Chip,
  EmptyState,
  PrimaryButton,
  RecipeCard,
  SearchField,
  StepHeader,
  Text,
} from '../../ui';

/** Letter tiles of the cards, in turn (mockup 14). */
const TILE_COLORS: readonly { color: ColorToken; background: ColorToken }[] = [
  { color: 'protein', background: 'proteinSoft' },
  { color: 'carbs', background: 'carbsSoft' },
  { color: 'accent', background: 'accentSoft' },
  { color: 'fat', background: 'fatSoft' },
];

type Filter = RecipeCategory | 'all';

// "Mes recettes" (mockup 14): search, category filter, values per serving, "Nouvelle recette".
export default function RecipesScreen() {
  const { t } = useTranslation();
  const userId = useSessionUserId() ?? '';
  const recipes = useLocalQuery(useCallback(() => readRecipes(localDb, userId), [userId]));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const shown = searchRecipes(recipes, query).filter(
    (recipe) => filter === 'all' || recipe.category === filter,
  );

  function details(recipe: RecipeDetail): string {
    return [
      recipe.category ? t(`recipes.categories.${recipe.category}`) : null,
      t('recipes.servings', { count: recipe.servings }),
      recipe.servingWeightG === null
        ? null
        : t('recipes.cooked', { grams: formatGrams(Math.round(recipe.servingWeightG)) }),
    ]
      .filter((part) => part !== null)
      .join(' · ');
  }

  function macros(recipe: RecipeDetail): string {
    const { proteinG, carbsG, fatG } = recipe.perServing;
    return t('recipes.macros', {
      protein: formatDecimal(Math.round(proteinG)),
      carbs: formatDecimal(Math.round(carbsG)),
      fat: formatDecimal(Math.round(fatG)),
    });
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <StepHeader
          backLabel={t('recipes.back')}
          onBack={() => {
            router.back();
          }}
          title={t('recipes.title')}
        />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('recipes.search')}
          accessibilityLabel={t('recipes.search')}
          clearLabel={t('recipes.clearSearch')}
          onClear={() => {
            setQuery('');
          }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('recipes.categoryFilter')}
          contentContainerStyle={styles.chips}
        >
          {(['all', ...RECIPE_CATEGORIES] as const).map((category) => (
            <Chip
              key={category}
              label={t(`recipes.categories.${category}`)}
              selected={filter === category}
              onPress={() => {
                setFilter(category);
              }}
            />
          ))}
        </ScrollView>

        {recipes.length === 0 ? <EmptyState message={t('recipes.empty')} /> : null}
        {recipes.length > 0 && shown.length === 0 ? (
          <Text color="textMuted" align="center">
            {t('recipes.noResult', { query: query.trim() })}
          </Text>
        ) : null}
        {shown.map((recipe) => {
          const tile = TILE_COLORS[recipes.indexOf(recipe) % TILE_COLORS.length] ?? TILE_COLORS[0];
          const kcal = formatDecimal(Math.round(recipe.perServing.kcal));
          return (
            <RecipeCard
              key={recipe.id}
              name={recipe.name}
              details={details(recipe)}
              macros={macros(recipe)}
              kcal={kcal}
              kcalUnit={t('recipes.kcalPerServing')}
              color={tile?.color ?? 'accent'}
              background={tile?.background ?? 'accentSoft'}
              accessibilityLabel={t('recipes.cardLabel', {
                name: recipe.name,
                details: details(recipe),
                kcal: `${kcal} kcal`,
                macros: macros(recipe),
              })}
              onPress={() => {
                router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } });
              }}
            />
          );
        })}
      </ScrollView>
      <View style={styles.action}>
        <PrimaryButton
          label={t('recipes.new')}
          icon={Plus}
          onPress={() => {
            useRecipeDraft.getState().start(emptyDraft());
            router.push('/recipes/edit');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[8],
    paddingBottom: space[24] * 4,
    gap: space[12],
  },
  chips: { gap: space[8] },
  action: {
    position: 'absolute',
    left: space.screen,
    right: space.screen,
    bottom: space[24] * 2,
  },
});
