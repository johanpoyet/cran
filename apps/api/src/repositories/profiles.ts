import type { Profile, PROFILE_REQUIRED_FIELDS, ProfileUpdate } from '@cran/shared';
import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '../db/client';
import { nextServerSeq, type ProfileRow, profiles } from '../db/schema';

/** Every query is scoped to the session's user: the repository never takes a profile id. */
export function createProfileRepository(db: AppDatabase) {
  async function find(userId: string): Promise<Profile | null> {
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .limit(1);
    return row ? toProfile(row) : null;
  }

  /** Creates the profile; a concurrent creation for the same user is applied as an update. */
  async function create(userId: string, values: ProfileCreate): Promise<Profile> {
    const now = new Date();
    const [row] = await db
      .insert(profiles)
      .values({ ...values, userId, updatedAt: now })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...values, updatedAt: now, deletedAt: null, serverSeq: nextServerSeq },
      })
      .returning();
    if (!row) throw new Error('profile insert returned no row');
    return toProfile(row);
  }

  async function update(userId: string, changes: ProfileUpdate): Promise<Profile | null> {
    const [row] = await db
      .update(profiles)
      .set({ ...changes, updatedAt: new Date(), serverSeq: nextServerSeq })
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .returning();
    return row ? toProfile(row) : null;
  }

  return { find, create, update };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;

/** Required fields plus any of the optional ones (the others take their defaults). */
export type ProfileCreate = Pick<Profile, (typeof PROFILE_REQUIRED_FIELDS)[number]> & ProfileUpdate;

export function toProfile(row: ProfileRow): Profile {
  return {
    sex: row.sex,
    birthYear: row.birthYear,
    heightCm: row.heightCm,
    activityLevel: row.activityLevel as Profile['activityLevel'],
    goalRateKgMonth: row.goalRateKgMonth as Profile['goalRateKgMonth'],
    proteinGPerKg: row.proteinGPerKg,
    fatGPerKg: row.fatGPerKg,
    trainingBonusKcal: row.trainingBonusKcal,
    trainingDays: row.trainingDays,
    waterGoalMl: row.waterGoalMl,
    reminders: row.reminders,
    healthDataConsentAt: row.healthDataConsentAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
