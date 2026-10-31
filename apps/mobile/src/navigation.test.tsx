import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from './app/_layout';
import AuthLayout from './app/(auth)/_layout';
import EmailScreen from './app/(auth)/email';
import SignInScreen from './app/(auth)/sign-in';
import OnboardingLayout from './app/(onboarding)/_layout';
import AboutStep from './app/(onboarding)/about';
import ActivityStep from './app/(onboarding)/activity';
import BodyStep from './app/(onboarding)/body';
import RateStep from './app/(onboarding)/rate';
import SummaryStep from './app/(onboarding)/summary';
import TrainingStep from './app/(onboarding)/training';
import TabsLayout from './app/(tabs)/_layout';
import TodayScreen from './app/(tabs)/index';
import JournalScreen from './app/(tabs)/journal';
import ProfileScreen from './app/(tabs)/profile';
import WeightScreen from './app/(tabs)/weight';
import AddSheet from './app/add';
import {
  authClient,
  onboarding,
  refreshSession,
  setSession,
  signedIn,
  signedOut,
} from './test/fake-auth-client';
import { mockFetchFailure, mockFetchResponse } from './test/fetch';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./lib/sentry', () => ({
  initSentry: jest.fn(),
  Sentry: { wrap: <T,>(component: T) => component },
}));
jest.mock('expo-apple-authentication', () => {
  const { Pressable } = jest.requireActual<{ Pressable: unknown }>('react-native');
  return {
    isAvailableAsync: () => Promise.resolve(true),
    signInAsync: jest.fn(),
    AppleAuthenticationButton: Pressable,
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { BLACK: 2 },
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  };
});

function renderApp(initialUrl = '/') {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      '(auth)/_layout': AuthLayout,
      '(auth)/sign-in': SignInScreen,
      '(auth)/email': EmailScreen,
      '(onboarding)/_layout': OnboardingLayout,
      '(onboarding)/rate': RateStep,
      '(onboarding)/about': AboutStep,
      '(onboarding)/body': BodyStep,
      '(onboarding)/activity': ActivityStep,
      '(onboarding)/training': TrainingStep,
      '(onboarding)/summary': SummaryStep,
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': TodayScreen,
      '(tabs)/journal': JournalScreen,
      '(tabs)/weight': WeightScreen,
      '(tabs)/profile': ProfileScreen,
      add: AddSheet,
    },
    { initialUrl },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('navigation guard', () => {
  it('sends a signed-out user to the sign-in screen', async () => {
    setSession(signedOut);
    await renderApp();
    expect(screen).toHavePathname('/sign-in');
    expect(screen.getByRole('header', { name: 'cran' })).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Continuer avec Apple' })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Jour' })).toBeNull();
  });

  it('opens a signed-in user (session restored at launch) on Today', async () => {
    setSession(signedIn);
    await renderApp('/sign-in');
    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
  });

  it('enters the app once signed in', async () => {
    setSession(signedOut);
    await renderApp();
    await act(() => {
      setSession(signedIn);
    });
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
  });

  it('returns to the sign-in screen when the session is revoked', async () => {
    setSession(signedIn);
    await renderApp('/journal');
    await act(() => {
      setSession(signedOut);
    });
    expect(screen).toHavePathname('/sign-in');
  });

  it('signs out from the profile tab', async () => {
    setSession(signedIn);
    await renderApp('/profile');
    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(authClient.signOut).toHaveBeenCalled();
    expect(screen).toHavePathname('/sign-in');
  });
});

describe('onboarding', () => {
  beforeEach(() => {
    setSession(onboarding);
  });

  async function press(name: string) {
    await fireEvent.press(screen.getByRole('button', { name }));
  }

  it('starts after sign-in, before the app', async () => {
    await renderApp();
    expect(screen).toHavePathname('/rate');
    expect(
      screen.getByRole('header', { name: 'À quel rythme veux-tu prendre ?' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^\+1 kg \/ mois, Recommandé/ })).toBeChecked();
    expect(screen.queryByRole('tab', { name: 'Jour' })).toBeNull();
  });

  it('goes through the five steps to the starting target, then opens the app', async () => {
    const fetchMock = mockFetchResponse(201, onboardingResult);
    refreshSession.mockImplementation(() => {
      setSession(signedIn);
    });
    await renderApp();

    // 1. Rate: the info explains the surplus of the selected rate.
    await fireEvent.press(screen.getByRole('radio', { name: /^\+1,5 kg/ }));
    expect(screen.getByText(/\+380 kcal par jour/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /^\+1 kg/ }));
    await press('Continuer');

    // 2. About: sex is required; the year changes the age shown.
    expect(screen).toHavePathname('/about');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Homme' }));
    for (let i = 0; i < 4; i += 1) await press('Année suivante');
    expect(screen.getByText('21 ans')).toBeOnTheScreen();
    await press('Continuer');

    // 3. Height and weight, with the rulers' accessibility actions.
    expect(screen).toHavePathname('/body');
    const height = screen.getByRole('adjustable', { name: 'Taille' });
    for (let i = 0; i < 5; i += 1) {
      await fireEvent(height, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    }
    expect(height).toHaveAccessibilityValue({ text: '180 cm' });
    const weight = screen.getByRole('adjustable', { name: 'Poids actuel' });
    for (let i = 0; i < 16; i += 1) {
      await fireEvent(weight, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    }
    expect(weight).toHaveAccessibilityValue({ text: '68,4 kg' });
    await press('Continuer');

    // 4. Activity is required.
    expect(screen).toHavePathname('/activity');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: /^Modérément actif/ }));
    await press('Continuer');

    // 5. Training days.
    expect(screen).toHavePathname('/training');
    for (const day of ['Lundi', 'Mercredi', 'Vendredi', 'Samedi']) {
      await fireEvent.press(screen.getByRole('checkbox', { name: day }));
    }
    expect(screen.getByText('4 séances par semaine')).toBeOnTheScreen();
    await press('Voir ma cible');

    // Starting target of the mockup; the consent is required.
    expect(screen).toHavePathname('/summary');
    expect(screen.getByText('2\u202f900\u00a0kcal')).toBeOnTheScreen();
    expect(screen.getByText('+150\u00a0kcal les jours de séance')).toBeOnTheScreen();
    expect(screen.getByText('2\u202f650\u00a0kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Protéines 150\u00a0g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Glucides 381\u00a0g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lipides 86\u00a0g')).toBeOnTheScreen();
    const start = screen.getByRole('button', { name: "C'est parti" });
    expect(start).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: /J'accepte que Cran traite/ }));
    await fireEvent.press(start);

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({
      sex: 'male',
      birthYear: 2005,
      heightCm: 180,
      weightKg: 68.4,
      activityLevel: 3,
      goalRateKgMonth: 1,
      trainingDays: 0b0110101,
      trainingBonusKcal: 150,
      healthDataConsent: true,
    });
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
  });

  it('keeps the summary and explains when the target cannot be saved', async () => {
    mockFetchFailure();
    await renderApp();
    await press('Continuer');
    await fireEvent.press(screen.getByRole('radio', { name: 'Femme' }));
    await press('Continuer');
    await press('Continuer');
    await fireEvent.press(screen.getByRole('radio', { name: /^Sédentaire/ }));
    await press('Continuer');
    await press('Voir ma cible');
    await fireEvent.press(screen.getByRole('checkbox', { name: /J'accepte que Cran traite/ }));
    await press("C'est parti");

    expect(screen.getByRole('alert')).toHaveTextContent(/Impossible de joindre Cran/);
    expect(screen).toHavePathname('/summary');
  });

  it('returns to the sign-in screen from the first step', async () => {
    await renderApp();
    await press('Retour à la connexion');
    expect(authClient.signOut).toHaveBeenCalled();
    expect(screen).toHavePathname('/sign-in');
  });
});

const onboardingResult = {
  profile: {
    sex: 'male',
    birthYear: 2005,
    heightCm: 180,
    activityLevel: 3,
    goalRateKgMonth: 1,
    proteinGPerKg: 2.2,
    fatGPerKg: 1.25,
    trainingBonusKcal: 150,
    trainingDays: 53,
    waterGoalMl: 3000,
    reminders: {
      meal: { enabled: true, time: '14:00' },
      weighIn: { enabled: true, time: '08:00' },
      weeklyReview: { enabled: false, time: '19:00' },
    },
    healthDataConsentAt: '2026-10-31T10:00:00.000Z',
    updatedAt: '2026-10-31T10:00:00.000Z',
  },
  weeklyTarget: {
    weekStart: '2026-10-26',
    maintenanceKcal: 2650,
    targetKcal: 2900,
    proteinG: 150,
    carbsG: 381,
    fatG: 86,
    method: 'formula',
    status: 'insufficient_data',
  },
};

describe('email sign-in', () => {
  beforeEach(() => {
    setSession(signedOut);
  });

  async function openEmailForm() {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer avec un email' }));
    expect(screen).toHavePathname('/email');
  }

  it('signs in with the typed credentials', async () => {
    authClient.signIn.email.mockImplementation(() => {
      setSession(signedIn);
      return Promise.resolve({ data: {}, error: null });
    });
    await openEmailForm();
    const submit = screen.getByRole('button', { name: 'Se connecter' });
    expect(submit).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Email'), ' johan@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'secret123');
    await fireEvent.press(submit);

    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: 'johan@example.com',
      password: 'secret123',
    });
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
  });

  it('shows why the sign-in failed', async () => {
    authClient.signIn.email.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 },
    });
    await openEmailForm();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'johan@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.');
    expect(screen).toHavePathname('/email');
  });

  it('creates an account with a password of at least 8 characters', async () => {
    authClient.signUp.email.mockResolvedValue({ data: {}, error: null });
    await openEmailForm();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Pas encore de compte ? Créer un compte' }),
    );
    expect(screen.getByText('8 caractères minimum')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'johan@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'short');
    const submit = screen.getByRole('button', { name: 'Créer mon compte' });
    expect(submit).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'long enough');
    await fireEvent.press(submit);
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      email: 'johan@example.com',
      password: 'long enough',
      name: '',
    });
  });

  it('goes back to the sign-in screen', async () => {
    await openEmailForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(screen).toHavePathname('/sign-in');
  });
});

describe('app navigation', () => {
  beforeEach(() => {
    setSession(signedIn);
  });

  it('opens on the Today tab', async () => {
    await renderApp();
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Jour' })).toBeSelected();
  });

  it.each([
    ['Journal', 'Journal', '/journal'],
    ['Poids', 'Poids', '/weight'],
    ['Profil', 'Objectifs', '/profile'],
  ])('goes to the %s tab', async (tab, title, path) => {
    await renderApp();
    await fireEvent.press(screen.getByRole('tab', { name: tab }));
    expect(screen).toHavePathname(path);
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: tab })).toBeSelected();
  });

  it('opens and closes the add sheet from the + button', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un aliment' }));
    expect(screen).toHavePathname('/add');
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen).toHavePathname('/');
  });
});
