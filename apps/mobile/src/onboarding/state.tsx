import { createContext, type ReactNode, use, useState } from 'react';

import { defaultAnswers, type OnboardingAnswers } from './answers';

interface OnboardingState {
  answers: OnboardingAnswers;
  update: (changes: Partial<OnboardingAnswers>) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

/** Keeps the answers while the user goes back and forth between the steps. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState(() => defaultAnswers(new Date()));
  function update(changes: Partial<OnboardingAnswers>) {
    setAnswers((current) => ({ ...current, ...changes }));
  }
  return <OnboardingContext value={{ answers, update }}>{children}</OnboardingContext>;
}

export function useOnboarding(): OnboardingState {
  const state = use(OnboardingContext);
  if (!state) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return state;
}
