import {
  type ActivityLevel,
  type GoalRateKgPerMonth,
  initialTarget,
  localDateKey,
  type Onboarding,
  PROFILE_DEFAULTS,
  type Sex,
} from '@cran/shared';

/** Answers being filled in, step by step; sex and activity have no default on purpose. */
export interface OnboardingAnswers {
  goalRateKgMonth: GoalRateKgPerMonth;
  sex: Sex | null;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel | null;
  trainingDays: number;
  trainingBonus: boolean;
}

export type CompleteAnswers = OnboardingAnswers & { sex: Sex; activityLevel: ActivityLevel };

/** Starting values of the pickers; the recommended rate is preselected (mockup step 1). */
export function defaultAnswers(today: Date): OnboardingAnswers {
  return {
    goalRateKgMonth: 1,
    sex: null,
    birthYear: today.getFullYear() - 25,
    heightCm: 175,
    weightKg: 70,
    activityLevel: null,
    trainingDays: 0,
    trainingBonus: true,
  };
}

export function isComplete(answers: OnboardingAnswers): answers is CompleteAnswers {
  return answers.sex !== null && answers.activityLevel !== null;
}

export function trainingBonusKcal(answers: OnboardingAnswers): number {
  return answers.trainingBonus ? PROFILE_DEFAULTS.trainingBonusKcal : 0;
}

/** Starting target shown on the summary; the API computes the same with the shared rules. */
export function startingTarget(answers: CompleteAnswers, today: Date) {
  return initialTarget({ ...answers, today });
}

export function toOnboardingRequest(answers: CompleteAnswers, today: Date): Onboarding {
  return {
    sex: answers.sex,
    birthYear: answers.birthYear,
    heightCm: answers.heightCm,
    activityLevel: answers.activityLevel,
    goalRateKgMonth: answers.goalRateKgMonth,
    trainingDays: answers.trainingDays,
    trainingBonusKcal: trainingBonusKcal(answers),
    weightKg: answers.weightKg,
    date: localDateKey(today),
    healthDataConsent: true,
  };
}
