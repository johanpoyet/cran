import { MEAL_TYPES } from '@cran/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

export const mealTypeEnum = pgEnum('meal_type', MEAL_TYPES);
