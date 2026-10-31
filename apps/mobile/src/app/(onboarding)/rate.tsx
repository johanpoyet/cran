import {
  dailySurplusKcal,
  formatInteger,
  GOAL_RATES_KG_PER_MONTH,
  type GoalRateKgPerMonth,
} from '@cran/shared';
import { router } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { signOut } from '../../auth';
import { OnboardingHeader, useOnboarding } from '../../onboarding';
import { space } from '../../theme/tokens';
import { InfoBanner, OptionCard, StepScreen, Text } from '../../ui';

const RATE_TEXTS = {
  0.5: { subtitle: 'onboarding.rate.slow', info: 'onboarding.rate.infoAfterSlow' },
  1: { subtitle: 'onboarding.rate.balanced', info: 'onboarding.rate.infoAfterBalanced' },
  1.5: { subtitle: 'onboarding.rate.fast', info: 'onboarding.rate.infoAfterFast' },
} as const satisfies Record<GoalRateKgPerMonth, object>;

const formatRate = (rate: number) => rate.toLocaleString('fr-FR');
const surplus = (rate: GoalRateKgPerMonth) => formatInteger(dailySurplusKcal(rate));

export default function RateStep() {
  const { t } = useTranslation();
  const { answers, update } = useOnboarding();
  const selected = answers.goalRateKgMonth;

  return (
    <StepScreen
      header={<OnboardingHeader step={1} onBack={() => void signOut()} />}
      title={t('onboarding.rate.title')}
      subtitle={t('onboarding.rate.subtitle')}
      action={{
        label: t('onboarding.continue'),
        onPress: () => {
          router.push('/about');
        },
      }}
    >
      <View style={styles.options}>
        {GOAL_RATES_KG_PER_MONTH.map((rate) => (
          <OptionCard
            key={rate}
            title={t('onboarding.rate.option', { rate: formatRate(rate) })}
            subtitle={t(RATE_TEXTS[rate].subtitle, { kcal: surplus(rate) })}
            {...(rate === 1 ? { badge: t('onboarding.rate.recommended') } : {})}
            selected={rate === selected}
            onPress={() => {
              update({ goalRateKgMonth: rate });
            }}
          />
        ))}
      </View>
      <InfoBanner icon={Info}>
        <Text variant="body">
          {t('onboarding.rate.infoBefore', { rate: formatRate(selected) })}
          <Text variant="body" weight={700}>
            {t('onboarding.rate.infoBold', { kcal: surplus(selected) })}
          </Text>
          {t(RATE_TEXTS[selected].info)}
        </Text>
      </InfoBanner>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space[12] },
});
