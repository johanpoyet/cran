import {
  formatLiters,
  formatTime,
  localDateKey,
  PROFILE_LIMITS,
  WATER_GLASS_ML,
} from '@cran/shared';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSessionUserId } from '../auth';
import { localDb, useLocalQuery } from '../db';
import { addWater, deleteWater, readToday, readWater } from '../journal';
import { refreshLocalCopy, setWaterGoal } from '../profile';
import { colors, radius, space, touch } from '../theme/tokens';
import { Card, Chip, Overline, PrimaryButton, ProgressBar, Stepper, Text } from '../ui';

const GOAL_STEP_ML = 250;

// Water of the day (no mockup): amount against the goal, the glasses added (touch one to remove
// it), a glass of 250 ml, and the daily goal. Works offline; the goal reaches the server later.
export default function WaterSheet() {
  const { t } = useTranslation();
  const userId = useSessionUserId() ?? '';
  const [today] = useState(() => new Date());
  const day = localDateKey(today);
  const water = useLocalQuery(useCallback(() => readWater(localDb, userId, day), [userId, day]));
  const goalMl = useLocalQuery(
    useCallback(() => readToday(localDb, userId, today).water.goalMl, [userId, today]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t('water.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('water.close')}
          onPress={() => {
            router.back();
          }}
          style={styles.close}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      <Card style={styles.card}>
        <Text variant="display" accessibilityLiveRegion="polite">
          {t('water.amount', {
            drunk: formatLiters(water.totalMl, { unit: false }),
            goal: formatLiters(goalMl ?? 0),
          })}
        </Text>
        <ProgressBar
          value={goalMl ? water.totalMl / goalMl : 0}
          color="water"
          accessibilityLabel={t('water.cardLabel', {
            drunk: formatLiters(water.totalMl),
            goal: formatLiters(goalMl ?? 0),
          })}
        />
        <PrimaryButton
          label={t('water.addGlass', { ml: WATER_GLASS_ML })}
          onPress={() => {
            addWater(localDb, userId, WATER_GLASS_ML, new Date());
          }}
        />
      </Card>

      <View style={styles.section}>
        <Overline>{t('water.today')}</Overline>
        {water.logs.length === 0 ? (
          <Text variant="body" color="textMuted">
            {t('water.empty')}
          </Text>
        ) : (
          <>
            <Text variant="caption" color="textMuted">
              {t('water.removeHint')}
            </Text>
            <View style={styles.chips}>
              {water.logs.map((log) => {
                const time = formatTime(log.createdAt);
                return (
                  <Chip
                    key={log.id}
                    label={t('water.glass', { ml: log.ml, time })}
                    variant="soft"
                    accessibilityLabel={t('water.removeGlass', { ml: log.ml, time })}
                    onPress={() => {
                      deleteWater(localDb, userId, log.id);
                    }}
                  />
                );
              })}
            </View>
          </>
        )}
      </View>

      {goalMl === null ? null : (
        <View style={styles.section}>
          <Overline>{t('water.goal')}</Overline>
          <Stepper
            value={goalMl}
            min={PROFILE_LIMITS.waterGoalMl.min}
            max={PROFILE_LIMITS.waterGoalMl.max}
            step={GOAL_STEP_ML}
            format={formatLiters}
            label={t('water.goal')}
            decrementLabel={t('water.decreaseGoal')}
            incrementLabel={t('water.increaseGoal')}
            onChange={(value) => {
              setWaterGoal(localDb, userId, value);
              // Sent now if online; otherwise at the next refresh (launch, foreground).
              void refreshLocalCopy(localDb);
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space[24],
    paddingBottom: space.screen,
    gap: space[24],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  title: { flex: 1 },
  close: {
    width: touch.minSize + space[8],
    height: touch.minSize + space[8],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: space[16], backgroundColor: colors.bg },
  section: { gap: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
