import { formatGrams, formatKcal, trainingDaysCount } from '@cran/shared';
import { router } from 'expo-router';
import { RotateCw } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  completeOnboarding,
  isComplete,
  type OnboardingErrorKey,
  startingTarget,
  trainingBonusKcal,
  useOnboarding,
} from '../../onboarding';
import { colors, space } from '../../theme/tokens';
import {
  Card,
  Checkbox,
  HeroCard,
  InfoBanner,
  StatTile,
  StepHeader,
  StepScreen,
  Text,
} from '../../ui';

export default function SummaryStep() {
  const { t } = useTranslation();
  const { answers } = useOnboarding();
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<OnboardingErrorKey | null>(null);

  // Steps 2 and 4 cannot be left without an answer, so this only guards a direct link.
  if (!isComplete(answers)) return null;

  const today = new Date();
  const target = startingTarget(answers, today);
  const bonus = trainingDaysCount(answers.trainingDays) > 0 ? trainingBonusKcal(answers) : 0;

  // On success the session carries the onboarding date and the root layout opens the app.
  async function start() {
    if (!isComplete(answers)) return;
    setPending(true);
    setError(null);
    const result = await completeOnboarding(answers, today);
    setPending(false);
    if (result.status === 'error') setError(result.error);
  }

  return (
    <StepScreen
      header={
        <StepHeader
          backLabel={t('onboarding.back')}
          onBack={() => {
            router.back();
          }}
          title={t('onboarding.summary.title')}
        />
      }
      action={{
        label: t('onboarding.summary.action'),
        disabled: !consent,
        loading: pending,
        onPress: () => void start(),
        ...(consent ? {} : { accessibilityHint: t('onboarding.summary.consentRequired') }),
      }}
      {...(error
        ? {
            footer: (
              <Text
                variant="label"
                weight={500}
                color="danger"
                align="center"
                accessibilityRole="alert"
              >
                {t(error)}
              </Text>
            ),
          }
        : {})}
    >
      <HeroCard style={styles.hero}>
        <View>
          <Text variant="body" color="onAccent">
            {t('onboarding.summary.aim')}
          </Text>
          <Text variant="display" color="onAccent" style={styles.target}>
            {formatKcal(target.targetKcal)}
          </Text>
          {bonus > 0 ? (
            <Text variant="label" color="onAccent">
              {t('onboarding.summary.trainingBonus', { kcal: formatKcal(bonus) })}
            </Text>
          ) : null}
        </View>
        <View style={styles.divider} />
        <Row
          label={t('onboarding.summary.maintenance')}
          value={formatKcal(target.maintenanceKcal)}
        />
        <Row
          label={t('onboarding.summary.surplus', {
            rate: answers.goalRateKgMonth.toLocaleString('fr-FR'),
          })}
          value={`+${formatKcal(target.surplusKcal)}`}
        />
      </HeroCard>

      <View style={styles.tiles}>
        <StatTile
          dot="protein"
          value={formatGrams(target.proteinG)}
          label={t('onboarding.summary.protein')}
        />
        <StatTile
          dot="carbs"
          value={formatGrams(target.carbsG)}
          label={t('onboarding.summary.carbs')}
        />
        <StatTile dot="fat" value={formatGrams(target.fatG)} label={t('onboarding.summary.fat')} />
      </View>

      <InfoBanner icon={RotateCw}>
        <Text variant="body">{t('onboarding.summary.adaptive')}</Text>
      </InfoBanner>

      <Card style={styles.consent}>
        <Checkbox checked={consent} onChange={setConsent} label={t('onboarding.summary.consent')}>
          <Text variant="body">
            {`${t('onboarding.summary.consent')} `}
            <Text variant="body" color="accent" style={styles.link}>
              {t('onboarding.summary.learnMore')}
            </Text>
          </Text>
        </Checkbox>
      </Card>

      <Text variant="caption" color="textMuted" align="center">
        {t('onboarding.summary.disclaimer')}
      </Text>
    </StepScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color="onAccent" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="body" weight={700} color="onAccent">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space[12] },
  target: { fontSize: 52, lineHeight: 58 },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.onAccentDivider },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  rowLabel: { flex: 1 },
  tiles: { flexDirection: 'row', gap: space[10] },
  consent: { padding: space[16] + 2 },
  link: { textDecorationLine: 'underline' },
});
