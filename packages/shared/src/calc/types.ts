import type { ACTIVITY_FACTORS, GOAL_RATES_KG_PER_MONTH } from './constants';

export type Sex = 'male' | 'female';
export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export type GoalRateKgPerMonth = (typeof GOAL_RATES_KG_PER_MONTH)[number];

export interface Macros {
  proteinG: number;
  fatG: number;
  carbsG: number;
}
