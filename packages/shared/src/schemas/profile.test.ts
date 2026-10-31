import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_REMINDERS, meSchema, profileSchema, profileUpdateSchema } from './profile';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const profile = {
  sex: 'male',
  birthYear: 2005,
  heightCm: 180,
  activityLevel: 3,
  goalRateKgMonth: 1,
  proteinGPerKg: 2.2,
  fatGPerKg: 1.25,
  trainingBonusKcal: 150,
  trainingDays: 0b0110101,
  waterGoalMl: 3000,
  reminders: DEFAULT_REMINDERS,
  updatedAt: '2026-10-31T12:00:00.000Z',
};

describe('profileSchema', () => {
  it('accepts the profile of the mockups', () => {
    expect(profileSchema.parse(profile)).toEqual(profile);
  });
});

describe('profileUpdateSchema', () => {
  it('accepts a partial update', () => {
    expect(profileUpdateSchema.parse({ goalRateKgMonth: 1.5 })).toEqual({ goalRateKgMonth: 1.5 });
  });

  it('rejects an empty update', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown fields, including ones the client must not set', () => {
    expect(profileUpdateSchema.safeParse({ heightCm: 180, userId: 'x' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ updatedAt: profile.updatedAt }).success).toBe(false);
  });

  it.each([
    ['sex', 'other'],
    ['birthYear', 2013], // 13 years old
    ['birthYear', 1925], // 101 years old
    ['birthYear', 2000.5],
    ['heightCm', 119],
    ['heightCm', 180.5],
    ['activityLevel', 6],
    ['goalRateKgMonth', 2],
    ['proteinGPerKg', 4],
    ['fatGPerKg', 0.2],
    ['trainingBonusKcal', -10],
    ['trainingDays', 128],
    ['waterGoalMl', 20_000],
  ])('rejects %s = %p', (field, value) => {
    expect(profileUpdateSchema.safeParse({ [field]: value }).success).toBe(false);
  });

  it.each([
    ['birthYear', 2012], // 14 years old
    ['birthYear', 1926], // 100 years old
    ['trainingDays', 0b1111111],
    ['goalRateKgMonth', 0.5],
  ])('accepts %s = %p', (field, value) => {
    expect(profileUpdateSchema.safeParse({ [field]: value }).success).toBe(true);
  });

  it('checks reminder times', () => {
    const reminders = { ...DEFAULT_REMINDERS, meal: { enabled: true, time: '24:00' } };
    expect(profileUpdateSchema.safeParse({ reminders }).success).toBe(false);
  });
});

describe('meSchema', () => {
  it('allows a missing profile before onboarding', () => {
    const me = {
      user: { id: '0195f2a4-9f3e-7c3a-8f2b-1d2e3f4a5b6c', email: 'johan@example.com' },
      profile: null,
    };
    expect(meSchema.parse(me)).toEqual(me);
  });
});
