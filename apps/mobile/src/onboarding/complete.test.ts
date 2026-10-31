import { refreshSession } from '../test/fake-auth-client';
import { mockFetchFailure, mockFetchResponse } from '../test/fetch';
import type { CompleteAnswers } from './answers';
import { completeOnboarding } from './complete';

jest.mock('../auth/client', () => jest.requireActual<object>('../test/fake-auth-client'));

const answers: CompleteAnswers = {
  goalRateKgMonth: 1,
  sex: 'male',
  birthYear: 2005,
  heightCm: 180,
  weightKg: 68.4,
  activityLevel: 3,
  trainingDays: 0,
  trainingBonus: true,
};
const today = new Date(2026, 9, 31);

const result = {
  profile: {
    sex: 'male',
    birthYear: 2005,
    heightCm: 180,
    activityLevel: 3,
    goalRateKgMonth: 1,
    proteinGPerKg: 2.2,
    fatGPerKg: 1.25,
    trainingBonusKcal: 150,
    trainingDays: 0,
    waterGoalMl: 3000,
    reminders: {
      meal: { enabled: true, time: '14:00' },
      weighIn: { enabled: true, time: '08:00' },
      weeklyReview: { enabled: false, time: '19:00' },
    },
    healthDataConsentAt: '2026-10-31T10:00:00.000Z',
    updatedAt: '2026-10-31T10:00:00.000Z',
  },
  weeklyTarget: {
    weekStart: '2026-10-26',
    maintenanceKcal: 2650,
    targetKcal: 2900,
    proteinG: 150,
    carbsG: 381,
    fatG: 86,
    method: 'formula',
    status: 'insufficient_data',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('completeOnboarding', () => {
  it('posts the answers with the session cookie, then refreshes the session', async () => {
    const fetchMock = mockFetchResponse(201, result);

    await expect(completeOnboarding(answers, today)).resolves.toEqual({ status: 'success' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/v1/onboarding',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ cookie: 'better-auth.session_token=token' }) as object,
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({
      date: '2026-10-31',
      healthDataConsent: true,
    });
    expect(refreshSession).toHaveBeenCalled();
  });

  it('treats an onboarding already saved (lost answer, retried) as done', async () => {
    mockFetchResponse(409, { error: { code: 'already_onboarded' } });
    await expect(completeOnboarding(answers, today)).resolves.toEqual({ status: 'success' });
    expect(refreshSession).toHaveBeenCalled();
  });

  it('reports a server error without leaving the summary', async () => {
    mockFetchResponse(500, { error: { code: 'internal_error' } });
    await expect(completeOnboarding(answers, today)).resolves.toEqual({
      status: 'error',
      error: 'onboarding.errors.unknown',
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('reports an unreachable server', async () => {
    mockFetchFailure();
    await expect(completeOnboarding(answers, today)).resolves.toEqual({
      status: 'error',
      error: 'onboarding.errors.network',
    });
  });
});
