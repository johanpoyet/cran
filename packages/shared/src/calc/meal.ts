export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

/** Start of each meal, in minutes after midnight; before breakfast it is still dinner time. */
const MEAL_STARTS: readonly [MealType, number][] = [
  ['breakfast', 4 * 60],
  ['lunch', 10 * 60 + 30],
  ['snack', 15 * 60],
  ['dinner', 18 * 60 + 30],
];

/**
 * Most likely meal at a local time, preselected when the add sheet opens: breakfast from 4:00,
 * lunch from 10:30, snack from 15:00, dinner from 18:30 (and late at night).
 */
export function mealForTime(date: Date): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  let meal: MealType = 'dinner';
  for (const [type, start] of MEAL_STARTS) if (minutes >= start) meal = type;
  return meal;
}
