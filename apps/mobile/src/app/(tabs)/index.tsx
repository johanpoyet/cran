import {
  formatDayLabel,
  formatGrams,
  formatInteger,
  formatKcal,
  formatLiters,
  formatTime,
  WATER_GLASS_ML,
} from '@cran/shared';
import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../../auth';
import { localDb, useLocalQuery } from '../../db';
import { addWater, type MealType, readToday } from '../../journal';
import { requestSync, useSyncState } from '../../sync';
import { type ColorToken, space } from '../../theme/tokens';
import {
  Badge,
  Chip,
  EmptyState,
  HeroCard,
  MacroTile,
  MealRow,
  ProgressBar,
  Screen,
  SyncBadge,
  type SyncBadgeState,
  Text,
  WaterCard,
} from '../../ui';

const MEAL_COLORS: Record<MealType, { color: ColorToken; background: ColorToken }> = {
  breakfast: { color: 'protein', background: 'proteinSoft' },
  lunch: { color: 'carbs', background: 'carbsSoft' },
  snack: { color: 'fat', background: 'fatSoft' },
  dinner: { color: 'accent', background: 'accentSoft' },
};
const EMPTY_MEAL = { color: 'textMuted', background: 'bg' } as const;

const MACROS = [
  { key: 'protein', eaten: 'proteinG', color: 'protein' },
  { key: 'carbs', eaten: 'carbsG', color: 'carbs' },
  { key: 'fat', eaten: 'fatG', color: 'fat' },
] as const;

// "Ta journée": what is left to eat, macros and the four meals of today, read from SQLite.
export default function TodayScreen() {
  const { t } = useTranslation();
  const userId = useSessionUserId();
  // The day is fixed when the screen mounts; the tab is remounted after a night in the background.
  const [today] = useState(() => new Date());
  const read = useCallback(
    () => (userId ? readToday(localDb, userId, today) : null),
    [userId, today],
  );
  const summary = useLocalQuery(read);

  const sync = useSyncState();
  const badgeState: SyncBadgeState =
    sync.status === 'syncing'
      ? 'syncing'
      : sync.status === 'offline'
        ? 'offline'
        : sync.status === 'error'
          ? 'error'
          : sync.pending > 0
            ? 'pending'
            : 'synced';
  const badgeLabel = {
    synced: t('sync.idle'),
    pending: t('sync.pending', { count: sync.pending }),
    syncing: t('sync.syncing'),
    offline:
      sync.pending > 0 ? t('sync.offlinePending', { count: sync.pending }) : t('sync.offline'),
    error: t('sync.error'),
  }[badgeState];

  const header = {
    title: t('today.title'),
    overline: formatDayLabel(today),
    accessory: (
      <View style={styles.accessory}>
        <SyncBadge
          state={badgeState}
          accessibilityLabel={badgeLabel}
          accessibilityHint={t('sync.hint')}
          onPress={() => void requestSync()}
        />
        <Chip
          label={t('today.week')}
          icon={CalendarDays}
          accessibilityHint={t('today.weekHint')}
          onPress={() => {
            router.navigate('/journal');
          }}
        />
      </View>
    ),
  };

  if (!summary?.target) {
    return (
      <Screen {...header}>
        <EmptyState message={t('today.noTarget')} />
      </Screen>
    );
  }

  const { target, eaten, meals, water } = summary;
  const waterGoal = water.goalMl ?? 0;
  const eatenKcal = Math.round(eaten.kcal);
  const left = target.kcal - eatenKcal;

  return (
    <Screen {...header}>
      <HeroCard style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroTexts}>
            <Text variant="lead" color="onAccent">
              {left >= 0 ? t('today.remaining') : t('today.over')}
            </Text>
            <Text variant="display" color="onAccent">
              {left >= 0 ? formatKcal(left) : `+${formatKcal(-left)}`}
            </Text>
          </View>
          <Badge label={t('today.surplus', { kcal: formatInteger(target.surplusKcal) })} />
        </View>
        <ProgressBar
          value={eatenKcal / target.kcal}
          color="onAccent"
          trackColor="onAccentTrack"
          accessibilityLabel={t('today.progressLabel', {
            eaten: formatKcal(eatenKcal),
            goal: formatKcal(target.kcal),
          })}
        />
        <View style={styles.heroBottom}>
          <Text variant="body" color="onAccent">
            {t('today.eaten', { kcal: formatInteger(eatenKcal) })}
          </Text>
          <Text variant="body" color="onAccent">
            {t('today.goal', { kcal: formatInteger(target.kcal) })}
          </Text>
        </View>
      </HeroCard>

      <View style={styles.macros}>
        {MACROS.map(({ key, eaten: eatenKey, color }) => {
          const grams = Math.round(eaten[eatenKey]);
          const goal = target[eatenKey];
          return (
            <MacroTile
              key={key}
              value={formatGrams(grams)}
              label={t(`macros.${key}`)}
              progress={goal > 0 ? grams / goal : 0}
              color={color}
              accessibilityLabel={t('today.macroLabel', {
                macro: t(`macros.${key}`),
                eaten: formatGrams(grams),
                goal: formatGrams(goal),
              })}
            />
          );
        })}
      </View>

      <WaterCard
        label={t('water.title')}
        amount={t('water.amount', {
          drunk: formatLiters(water.totalMl, { unit: false }),
          goal: formatLiters(waterGoal),
        })}
        progress={waterGoal > 0 ? water.totalMl / waterGoal : 0}
        addLabel={t('water.addGlass', { ml: WATER_GLASS_ML })}
        onAdd={() => {
          if (userId) addWater(localDb, userId, WATER_GLASS_ML, new Date());
        }}
        accessibilityLabel={t('water.cardLabel', {
          drunk: formatLiters(water.totalMl),
          goal: formatLiters(waterGoal),
        })}
        accessibilityHint={t('water.cardHint')}
        onPress={() => {
          router.push('/water');
        }}
      />

      <Text variant="heading" weight={800} accessibilityRole="header">
        {t('today.meals')}
      </Text>
      <View style={styles.meals}>
        {meals.map((meal) => {
          const name = t(`meals.${meal.mealType}`);
          const filled = meal.count > 0 && meal.firstLoggedAt !== null;
          const subtitle =
            filled && meal.firstLoggedAt
              ? t('today.mealSummary', { count: meal.count, time: formatTime(meal.firstLoggedAt) })
              : t('today.mealEmpty');
          const kcal = formatInteger(Math.round(meal.kcal));
          return (
            <MealRow
              key={meal.mealType}
              letter={t(`mealLetters.${meal.mealType}`)}
              title={name}
              subtitle={subtitle}
              {...(filled ? { value: kcal } : {})}
              {...(filled ? MEAL_COLORS[meal.mealType] : EMPTY_MEAL)}
              accessibilityLabel={
                filled
                  ? t('today.mealLabel', {
                      meal: name,
                      summary: subtitle,
                      kcal: formatKcal(Math.round(meal.kcal)),
                    })
                  : t('today.mealEmptyLabel', { meal: name })
              }
              accessibilityHint={filled ? t('today.mealOpenHint') : t('today.mealHint')}
              onPress={() => {
                // A filled meal opens its entries; an empty one, the add sheet.
                if (filled) {
                  router.push({ pathname: '/meal/[type]', params: { type: meal.mealType } });
                } else {
                  router.push({ pathname: '/add', params: { meal: meal.mealType } });
                }
              }}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accessory: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  hero: { gap: space[16] },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroTexts: { flex: 1, gap: space[4] },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  macros: { flexDirection: 'row', gap: space[12] },
  meals: { gap: space[12] },
});
