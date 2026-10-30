import { assertPositive } from './assert';
import { ACTIVITY_FACTORS, DAYS_PER_MONTH, KCAL_PER_KG } from './constants';
import { roundToTen } from './rounding';
import type { ActivityLevel, GoalRateKgPerMonth, Sex } from './types';

export interface BodyProfile {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
}

/** Age reached during the current calendar year (the profile only stores the birth year). */
export function ageFromBirthYear(birthYear: number, today: Date): number {
  const age = today.getFullYear() - birthYear;
  assertPositive('age', age);
  return age;
}

/** Basal metabolic rate, Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + s (s = +5 male, −161 female). */
export function basalMetabolicRate({ sex, ageYears, heightCm, weightKg }: BodyProfile): number {
  assertPositive('ageYears', ageYears);
  assertPositive('heightCm', heightCm);
  assertPositive('weightKg', weightKg);
  const s = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

/** Initial maintenance: BMR × activity factor, rounded to 10 kcal. */
export function initialMaintenanceKcal(profile: BodyProfile, activityLevel: ActivityLevel): number {
  return roundToTen(basalMetabolicRate(profile) * ACTIVITY_FACTORS[activityLevel]);
}

/** Daily surplus for a monthly gain rate: rate × 7 700 / 30.4, rounded to 10 kcal. */
export function dailySurplusKcal(rateKgPerMonth: GoalRateKgPerMonth): number {
  return roundToTen((rateKgPerMonth * KCAL_PER_KG) / DAYS_PER_MONTH);
}

export interface DailyTargetInput {
  maintenanceKcal: number;
  surplusKcal: number;
  trainingBonusKcal: number;
  isTrainingDay: boolean;
}

/** Target of the day: maintenance + surplus, plus the training bonus on a training day. */
export function dailyTargetKcal({
  maintenanceKcal,
  surplusKcal,
  trainingBonusKcal,
  isTrainingDay,
}: DailyTargetInput): number {
  assertPositive('maintenanceKcal', maintenanceKcal);
  return maintenanceKcal + surplusKcal + (isTrainingDay ? trainingBonusKcal : 0);
}
