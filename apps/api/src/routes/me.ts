import {
  meSchema,
  PROFILE_REQUIRED_FIELDS,
  type ProfileUpdate,
  profileUpdateSchema,
} from '@cran/shared';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';

import { errorBody, ErrorSchema } from '../errors';
import type { SessionVariables } from '../middleware/session';
import type { ProfileCreate, ProfileRepository } from '../repositories/profiles';

const MeSchema = meSchema.meta({ id: 'Me' });
const ProfileUpdateSchema = profileUpdateSchema.meta({ id: 'ProfileUpdate' });

const unauthorized = {
  description: 'No valid session',
  content: { 'application/json': { schema: ErrorSchema } },
};

const getMe = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Profile'],
  summary: 'Current account and profile',
  description: 'The profile is null until the onboarding has been completed.',
  responses: {
    200: {
      description: 'Account and profile',
      content: { 'application/json': { schema: MeSchema } },
    },
    401: unauthorized,
  },
});

const patchMe = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Profile'],
  summary: 'Update the profile and settings',
  description: `Partial update. The first call creates the profile and must include ${PROFILE_REQUIRED_FIELDS.join(', ')}; the other fields take their defaults.`,
  request: {
    body: { required: true, content: { 'application/json': { schema: ProfileUpdateSchema } } },
  },
  responses: {
    200: { description: 'Updated profile', content: { 'application/json': { schema: MeSchema } } },
    400: {
      description: 'Invalid fields',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    401: unauthorized,
    422: {
      description: 'No profile yet and required fields are missing',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

function missingFields(changes: ProfileUpdate) {
  return PROFILE_REQUIRED_FIELDS.filter((field) => changes[field] === undefined);
}

function canCreate(changes: ProfileUpdate): changes is ProfileCreate {
  return missingFields(changes).length === 0;
}

export function meRoutes(profiles: ProfileRepository) {
  return new OpenAPIHono<{ Variables: SessionVariables }>()
    .openapi(getMe, async (c) => {
      const user = c.get('user');
      const profile = await profiles.find(user.id);
      return c.json({ user: { id: user.id, email: user.email }, profile }, 200);
    })
    .openapi(patchMe, async (c) => {
      const user = c.get('user');
      const changes = c.req.valid('json');
      let profile = await profiles.update(user.id, changes);
      if (!profile) {
        // No profile yet: this is the end of the onboarding, which sends every required field.
        if (!canCreate(changes)) {
          return c.json(
            errorBody('profile_incomplete', 'Missing fields to create the profile', {
              missing: missingFields(changes),
            }),
            422,
          );
        }
        profile = await profiles.create(user.id, changes);
      }
      return c.json({ user: { id: user.id, email: user.email }, profile }, 200);
    });
}
