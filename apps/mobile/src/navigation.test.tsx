import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from './app/_layout';
import AuthLayout from './app/(auth)/_layout';
import EmailScreen from './app/(auth)/email';
import SignInScreen from './app/(auth)/sign-in';
import TabsLayout from './app/(tabs)/_layout';
import TodayScreen from './app/(tabs)/index';
import JournalScreen from './app/(tabs)/journal';
import ProfileScreen from './app/(tabs)/profile';
import WeightScreen from './app/(tabs)/weight';
import AddSheet from './app/add';
import { authClient, setSession, signedIn, signedOut } from './test/fake-auth-client';

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
