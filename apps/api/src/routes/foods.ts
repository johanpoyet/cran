import { foodSearchQuerySchema, foodSearchResultSchema } from '@cran/shared';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';

import { ErrorSchema } from '../errors';
import type { SessionVariables } from '../middleware/session';
import type { FoodRepository } from '../repositories/foods';

const FoodSearchQuerySchema = foodSearchQuerySchema.meta({ id: 'FoodSearchQuery' });
const FoodSearchResultSchema = foodSearchResultSchema.meta({ id: 'FoodSearchResult' });

const searchFoods = createRoute({
  method: 'get',
  path: '/foods/search',
  tags: ['Foods'],
  summary: 'Search foods',
  description:
    "The user's own foods first, then CIQUAL, then the Open Food Facts cache. Every word of the query must match the name or the brand; accents are ignored and a slight typo is forgiven.",
  request: { query: FoodSearchQuerySchema },
  responses: {
    200: {
      description: 'Matching foods, best first',
      content: { 'application/json': { schema: FoodSearchResultSchema } },
    },
    400: {
      description: 'Missing or invalid query',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: {
      description: 'No valid session',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

export function foodRoutes(foods: FoodRepository) {
  return new OpenAPIHono<{ Variables: SessionVariables }>().openapi(searchFoods, async (c) => {
    const { q, limit } = c.req.valid('query');
    return c.json({ foods: await foods.search(c.get('user').id, q, limit) }, 200);
  });
}
