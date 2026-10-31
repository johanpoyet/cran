import { PROFILE_LIMITS, WEIGHT_LIMITS_KG } from '@cran/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { OnboardingHeader, useOnboarding } from '../../onboarding';
import { space } from '../../theme/tokens';
import { Card, Overline, RulerPicker, StepScreen } from '../../ui';

const weightFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function BodyStep() {
  const { t } = useTranslation();
  const { answers, update } = useOnboarding();

  return (
    <StepScreen
      header={<OnboardingHeader step={3} />}
      title={t('onboarding.body.title')}
      subtitle={t('onboarding.body.subtitle')}
      action={{
        label: t('onboarding.continue'),
        onPress: () => {
          router.push('/activity');
        },
      }}
    >
      <Card style={styles.card}>
        <Overline>{t('onboarding.body.height')}</Overline>
        <RulerPicker
          label={t('onboarding.body.height')}
          value={answers.heightCm}
          min={PROFILE_LIMITS.heightCm.min}
          max={PROFILE_LIMITS.heightCm.max}
          step={1}
          format={String}
          unit={t('onboarding.body.cm')}
          onChange={(heightCm) => {
            update({ heightCm });
          }}
        />
      </Card>
      <Card style={styles.card}>
        <Overline>{t('onboarding.body.weight')}</Overline>
        <RulerPicker
          label={t('onboarding.body.weight')}
          value={answers.weightKg}
          min={WEIGHT_LIMITS_KG.min}
          max={WEIGHT_LIMITS_KG.max}
          step={0.1}
          format={(kg) => weightFormat.format(kg)}
          unit={t('onboarding.body.kg')}
          onChange={(weightKg) => {
            update({ weightKg });
          }}
        />
      </Card>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[8], padding: space[16] + 2 },
});
