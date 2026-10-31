import { ageFromBirthYear, PROFILE_LIMITS } from '@cran/shared';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { OnboardingHeader, useOnboarding } from '../../onboarding';
import { colors, space } from '../../theme/tokens';
import { Card, ChoiceButton, Overline, Stepper, StepScreen, Text } from '../../ui';

export default function AboutStep() {
  const { t } = useTranslation();
  const { answers, update } = useOnboarding();
  const today = new Date();
  const year = today.getFullYear();
  const age = ageFromBirthYear(answers.birthYear, today);

  return (
    <StepScreen
      header={<OnboardingHeader step={2} />}
      title={t('onboarding.about.title')}
      subtitle={t('onboarding.about.subtitle')}
      action={{
        label: t('onboarding.continue'),
        disabled: answers.sex === null,
        onPress: () => {
          router.push('/body');
        },
      }}
    >
      <Card style={styles.card}>
        <Overline>{t('onboarding.about.sex')}</Overline>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          <ChoiceButton
            label={t('onboarding.about.male')}
            selected={answers.sex === 'male'}
            onPress={() => {
              update({ sex: 'male' });
            }}
          />
          <ChoiceButton
            label={t('onboarding.about.female')}
            selected={answers.sex === 'female'}
            onPress={() => {
              update({ sex: 'female' });
            }}
          />
        </View>
      </Card>
      <Card style={styles.card}>
        <Overline>{t('onboarding.about.birthYear')}</Overline>
        <Stepper
          value={answers.birthYear}
          min={year - PROFILE_LIMITS.age.max}
          max={year - PROFILE_LIMITS.age.min}
          onChange={(birthYear) => {
            update({ birthYear });
          }}
          label={t('onboarding.about.birthYear')}
          decrementLabel={t('onboarding.about.older')}
          incrementLabel={t('onboarding.about.younger')}
          caption={t('onboarding.about.age', { count: age })}
        />
      </Card>
      <View style={styles.privacy}>
        <Lock color={colors.textMuted} size={18} />
        <Text variant="label" weight={500} color="textMuted" style={styles.privacyText}>
          {t('onboarding.about.privacy')}
        </Text>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[16], padding: space[16] + 2 },
  choices: { flexDirection: 'row', gap: space[10] },
  privacy: { flexDirection: 'row', gap: space[12], paddingHorizontal: space[8] },
  privacyText: { flex: 1 },
});
