import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onboardingSchema } from './onboarding';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const answers = {
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
};

describe('onboardingSchema', () => {
  it('accepts the answers of the mockups', () => {
    expect(onboardingSchema.parse(answers)).toEqual(answers);
  });

  it('requires the health data consent', () => {
    expect(onboardingSchema.safeParse({ ...answers, healthDataConsent: false }).success).toBe(
      false,
    );
    expect(onboardingSchema.safeParse({ ...answers, healthDataConsent: undefined }).success).toBe(
      false,
    );
  });

  it.each([
    ['weightKg', 29.9],
    ['weightKg', 250.5],
    ['weightKg', 68.456],
    ['date', '2026-02-30'],
    ['date', '31/10/2026'],
    ['heightCm', 300],
    ['trainingBonusKcal', -1],
  ])('rejects %s = %p', (field, value) => {
    expect(onboardingSchema.safeParse({ ...answers, [field]: value }).success).toBe(false);
  });

  it('accepts a weight with two decimals', () => {
    expect(onboardingSchema.safeParse({ ...answers, weightKg: 68.45 }).success).toBe(true);
  });

  it('rejects unknown fields', () => {
    expect(onboardingSchema.safeParse({ ...answers, proteinGPerKg: 3 }).success).toBe(false);
  });
});
