import {
  type CompleteAnswers,
  defaultAnswers,
  isComplete,
  startingTarget,
  toOnboardingRequest,
} from './answers';

const today = new Date(2026, 9, 31, 9, 30);

// Answers of the onboarding mockups.
const mockup: CompleteAnswers = {
  goalRateKgMonth: 1,
  sex: 'male',
  birthYear: 2005,
  heightCm: 180,
  weightKg: 68.4,
  activityLevel: 3,
  trainingDays: 0b0110101,
  trainingBonus: true,
};

describe('defaultAnswers', () => {
  it('preselects the recommended rate but neither sex nor activity', () => {
    const answers = defaultAnswers(today);
    expect(answers).toMatchObject({ goalRateKgMonth: 1, sex: null, activityLevel: null });
    expect(answers.birthYear).toBe(2001);
    expect(isComplete(answers)).toBe(false);
  });
});

describe('startingTarget', () => {
  it('gives the "Ta cible de départ" mockup', () => {
    expect(startingTarget(mockup, today)).toEqual({
      maintenanceKcal: 2650,
      surplusKcal: 250,
      targetKcal: 2900,
      proteinG: 150,
      carbsG: 381,
      fatG: 86,
    });
  });
});

describe('toOnboardingRequest', () => {
  it('sends the local day, the training bonus and the consent', () => {
    expect(toOnboardingRequest(mockup, today)).toEqual({
      sex: 'male',
      birthYear: 2005,
      heightCm: 180,
      activityLevel: 3,
      goalRateKgMonth: 1,
      trainingDays: 0b0110101,
      trainingBonusKcal: 150,
      weightKg: 68.4,
      date: '2026-10-31',
      healthDataConsent: true,
    });
  });

  it('sends no bonus when it is switched off', () => {
    expect(toOnboardingRequest({ ...mockup, trainingBonus: false }, today).trainingBonusKcal).toBe(
      0,
    );
  });
});
