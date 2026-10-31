import { formatInteger, PROFILE_DEFAULTS, trainingDaysCount } from '@cran/shared';
import { router } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { OnboardingHeader, useOnboarding } from '../../onboarding';
import { space } from '../../theme/tokens';
import { Card, DayPicker, IconTile, StepScreen, SwitchRow, Text } from '../../ui';

export default function TrainingStep() {
  const { t } = useTranslation();
  const { answers, update } = useOnboarding();
  const sessions = trainingDaysCount(answers.trainingDays);

  return (
    <StepScreen
      header={<OnboardingHeader step={5} />}
      title={t('onboarding.training.title')}
      subtitle={t('onboarding.training.subtitle')}
      action={{
        label: t('onboarding.training.action'),
        onPress: () => {
          router.push('/summary');
        },
      }}
    >
      <Card style={styles.days}>
        <DayPicker
          mask={answers.trainingDays}
          onChange={(trainingDays) => {
            update({ trainingDays });
          }}
          letters={t('onboarding.training.letters', { returnObjects: true })}
          names={t('onboarding.training.days', { returnObjects: true })}
        />
        <Text variant="label" weight={500} color="textMuted" align="center">
          {t('onboarding.training.sessions', { count: sessions })}
        </Text>
      </Card>
      <Card style={styles.card}>
        <SwitchRow
          title={t('onboarding.training.bonusTitle')}
          subtitle={t('onboarding.training.bonusSubtitle', {
            kcal: formatInteger(PROFILE_DEFAULTS.trainingBonusKcal),
          })}
          value={answers.trainingBonus}
          onValueChange={(trainingBonus) => {
            update({ trainingBonus });
          }}
        />
      </Card>
      <Card style={[styles.card, styles.surcharge]}>
        <IconTile icon={Dumbbell} color="protein" background="proteinSoft" />
        <View style={styles.surchargeText}>
          <Text variant="body" weight={700}>
            {t('onboarding.training.surchargeTitle')}
          </Text>
          <Text variant="label" weight={500} color="textMuted">
            {t('onboarding.training.surchargeText')}
          </Text>
        </View>
      </Card>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  days: { gap: space[16], paddingHorizontal: space[12], paddingVertical: space[16] + 2 },
  card: { padding: space[16] + 2 },
  surcharge: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  surchargeText: { flex: 1, gap: space[4] / 2 },
});
