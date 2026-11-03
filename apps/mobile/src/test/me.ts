import type { Me } from '@cran/shared';

/** Answer of GET /v1/me after the onboarding of the mockups. */
export const me: Me = {
  user: { id: '0192f0c0-0000-7000-8000-00000000a11c', email: 'johan@example.com' },
  profile: {
    id: '0195f2a4-9f3e-7c3a-8f2b-000000000001',
    sex: 'male',
    birthYear: 2005,
    heightCm: 180,
    activityLevel: 3,
    goalRateKgMonth: 1,
    proteinGPerKg: 2.2,
    fatGPerKg: 1.25,
    trainingBonusKcal: 150,
    trainingDays: 53,
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
    id: '0195f2a4-9f3e-7c3a-8f2b-000000000002',
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
