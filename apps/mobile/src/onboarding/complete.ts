import { onboardingResultSchema } from '@cran/shared';

import { refreshSession } from '../auth';
import type fr from '../i18n/fr.json';
import { ApiError, apiFetch } from '../lib/api';
import { type CompleteAnswers, toOnboardingRequest } from './answers';

export type OnboardingErrorKey = `onboarding.errors.${keyof (typeof fr)['onboarding']['errors']}`;

export type CompleteResult = { status: 'success' } | { status: 'error'; error: OnboardingErrorKey };

/**
 * Sends the answers; once saved, the refreshed session carries the onboarding date and the
 * navigation guard opens the app. A 409 means an earlier attempt was saved but its answer lost.
 */
export async function completeOnboarding(
  answers: CompleteAnswers,
  today: Date,
): Promise<CompleteResult> {
  try {
    await apiFetch('/v1/onboarding', onboardingResultSchema, {
      method: 'POST',
      body: toOnboardingRequest(answers, today),
    });
  } catch (error) {
    if (!(error instanceof ApiError))
      return { status: 'error', error: 'onboarding.errors.network' };
    if (error.status !== 409) return { status: 'error', error: 'onboarding.errors.unknown' };
  }
  refreshSession();
  return { status: 'success' };
}
