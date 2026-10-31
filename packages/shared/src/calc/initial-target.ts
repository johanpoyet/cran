import { ageFromBirthYear, dailySurplusKcal, initialMaintenanceKcal } from './energy';
import { macrosForTarget } from './macros';
import type { ActivityLevel, GoalRateKgPerMonth, Macros, Sex } from './types';

export interface InitialTargetInput {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalRateKgMonth: GoalRateKgPerMonth;
  proteinGPerKg?: number | undefined;
  fatGPerKg?: number | undefined;
  today: Date;
}

export interface InitialTarget extends Macros {
  maintenanceKcal: number;
  surplusKcal: number;
  /** Target of a rest day; the training bonus is added on training days. */
  targetKcal: number;
}

/** Starting target of the onboarding ("Ta cible de départ"), from the formula (spec section 6). */
export function initialTarget({
  sex,
  birthYear,
  heightCm,
  weightKg,
  activityLevel,
  goalRateKgMonth,
  proteinGPerKg,
  fatGPerKg,
  today,
}: InitialTargetInput): InitialTarget {
  const ageYears = ageFromBirthYear(birthYear, today);
  const maintenanceKcal = initialMaintenanceKcal(
    { sex, ageYears, heightCm, weightKg },
    activityLevel,
  );
  const surplusKcal = dailySurplusKcal(goalRateKgMonth);
  const targetKcal = maintenanceKcal + surplusKcal;
  const macros = macrosForTarget({
    targetKcal,
    weightKg,
    ...(proteinGPerKg === undefined ? {} : { proteinGPerKg }),
    ...(fatGPerKg === undefined ? {} : { fatGPerKg }),
  });
  return { maintenanceKcal, surplusKcal, targetKcal, ...macros };
}
