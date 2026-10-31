import { onboardingResultSchema, onboardingSchema } from '@cran/shared';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';

import { errorBody, ErrorSchema } from '../errors';
import type { SessionVariables } from '../middleware/session';
import { AlreadyOnboardedError, type OnboardingRepository } from '../repositories/onboarding';

const errorContent = { 'application/json': { schema: ErrorSchema } };

const completeOnboarding = createRoute({
  method: 'post',
  path: '/onboarding',
  tags: ['Profile'],
  summary: 'Complete the onboarding',
  description:
    'Creates the profile (with the health data consent), the first weigh-in and the first weekly target computed from the formula. Can only be done once per account.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: onboardingSchema.meta({ id: 'Onboarding' }) } },
    },
  },
  responses: {
    201: {
      description: 'Profile and starting target',
      content: {
        'application/json': { schema: onboardingResultSchema.meta({ id: 'OnboardingResult' }) },
      },
    },
    400: { description: 'Invalid answers or consent missing', content: errorContent },
    401: { description: 'No valid session', content: errorContent },
    409: { description: 'The onboarding is already completed', content: errorContent },
  },
});

export function onboardingRoutes(onboarding: OnboardingRepository) {
  return new OpenAPIHono<{ Variables: SessionVariables }>().openapi(
    completeOnboarding,
    async (c) => {
      try {
        const result = await onboarding.complete(c.get('user').id, c.req.valid('json'));
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof AlreadyOnboardedError) {
          return c.json(errorBody('already_onboarded', error.message), 409);
        }
        throw error;
      }
    },
  );
}
