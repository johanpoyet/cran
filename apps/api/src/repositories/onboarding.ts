import { initialTarget, type Onboarding, type OnboardingResult, weekStart } from '@cran/shared';
import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../db/client';
import { profiles, user, weeklyTargets, weighIns } from '../db/schema';
import { toProfile } from './profiles';

export class AlreadyOnboardedError extends Error {
  constructor() {
    super('The onboarding is already completed');
  }
}

/**
 * Saves the end of the onboarding in one transaction: the profile with the health data consent,
 * the first weigh-in, the first weekly target (formula) and the onboarding date of the user.
 */
export function createOnboardingRepository(db: AppDatabase) {
  async function complete(userId: string, answers: Onboarding): Promise<OnboardingResult> {
    const now = new Date();
    // The answers' local day drives the age and the week, not the server's clock.
    const target = initialTarget({ ...answers, today: new Date(`${answers.date}T12:00:00`) });

    return db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId,
          sex: answers.sex,
          birthYear: answers.birthYear,
          heightCm: answers.heightCm,
          activityLevel: answers.activityLevel,
          goalRateKgMonth: answers.goalRateKgMonth,
          trainingDays: answers.trainingDays,
          trainingBonusKcal: answers.trainingBonusKcal,
          healthDataConsentAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: profiles.userId })
        .returning();
      if (!profile) throw new AlreadyOnboardedError();

      await tx.insert(weighIns).values({
        userId,
        date: answers.date,
        measuredAt: now,
        weightKg: answers.weightKg,
        source: 'manual',
        updatedAt: now,
      });

      const weeklyTarget = {
        weekStart: weekStart(answers.date),
        maintenanceKcal: target.maintenanceKcal,
        targetKcal: target.targetKcal,
        proteinG: target.proteinG,
        carbsG: target.carbsG,
        fatG: target.fatG,
        method: 'formula' as const,
        // No weight trend yet: the adaptive check starts with the weigh-ins (S7).
        status: 'insufficient_data' as const,
      };
      await tx.insert(weeklyTargets).values({ ...weeklyTarget, userId, updatedAt: now });

      await tx.update(user).set({ onboardedAt: now }).where(eq(user.id, userId));

      return { profile: toProfile(profile), weeklyTarget };
    });
  }

  return { complete };
}

export type OnboardingRepository = ReturnType<typeof createOnboardingRepository>;
