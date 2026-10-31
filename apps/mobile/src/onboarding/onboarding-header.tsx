import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepHeader } from '../ui';

export const ONBOARDING_STEPS = 5;

interface OnboardingHeaderProps {
  step: number;
  /** First step: going back leaves the onboarding (signs out). */
  onBack?: () => void;
}

export function OnboardingHeader({ step, onBack }: OnboardingHeaderProps) {
  const { t } = useTranslation();
  return (
    <StepHeader
      backLabel={t(onBack ? 'onboarding.backToSignIn' : 'onboarding.back')}
      onBack={
        onBack ??
        (() => {
          router.back();
        })
      }
      progress={{
        step,
        total: ONBOARDING_STEPS,
        label: t('onboarding.progress', { step, total: ONBOARDING_STEPS }),
      }}
    />
  );
}
