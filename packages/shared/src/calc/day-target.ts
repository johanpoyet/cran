import { KCAL_PER_GRAM } from './constants';
import { isTrainingDay } from './training-days';

export interface DayTarget {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Target minus maintenance ("Surplus +250"), training bonus included. */
  surplusKcal: number;
  trainingDay: boolean;
}

/**
 * Target of one day (docs/SPEC.md section 6): the weekly target, plus the training bonus of the
 * profile when the day is ticked in `training_days`. The bonus goes to the carbohydrates.
 */
export function dayTarget(
  week: {
    maintenanceKcal: number;
    targetKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
  profile: { trainingBonusKcal: number; trainingDays: number },
  date: Date,
): DayTarget {
  const trainingDay = isTrainingDay(profile.trainingDays, date);
  const bonus = trainingDay ? profile.trainingBonusKcal : 0;
  return {
    kcal: week.targetKcal + bonus,
    proteinG: week.proteinG,
    carbsG: week.carbsG + Math.floor(bonus / KCAL_PER_GRAM.carbs),
    fatG: week.fatG,
    surplusKcal: week.targetKcal + bonus - week.maintenanceKcal,
    trainingDay,
  };
}
