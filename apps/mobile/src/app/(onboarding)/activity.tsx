import type { ActivityLevel } from '@cran/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { OnboardingHeader, useOnboarding } from '../../onboarding';
import { space } from '../../theme/tokens';
import { OptionCard, StepScreen } from '../../ui';

const LEVELS = [1, 2, 3, 4, 5] as const satisfies readonly ActivityLevel[];

export default function ActivityStep() {
  const { t } = useTranslation();
  const { answers, update } = useOnboarding();

  return (
    <StepScreen
      header={<OnboardingHeader step={4} />}
      title={t('onboarding.activity.title')}
      subtitle={t('onboarding.activity.subtitle')}
      action={{
        label: t('onboarding.continue'),
        disabled: answers.activityLevel === null,
        onPress: () => {
          router.push('/training');
        },
      }}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {LEVELS.map((level) => (
          <OptionCard
            key={level}
            title={t(`onboarding.activity.levels.${level}.title`)}
            subtitle={t(`onboarding.activity.levels.${level}.subtitle`)}
            selected={answers.activityLevel === level}
            onPress={() => {
              update({ activityLevel: level });
            }}
          />
        ))}
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space[12] },
});
