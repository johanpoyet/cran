import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import EntrySheet from './app/entry/[id]';
import MealSheet from './app/meal/[type]';
import {
  deleteEntry,
  type Entry,
  readEntry,
  readMealEntries,
  updateEntry,
} from './journal/entries';
import { setSession, signedIn } from './test/fake-auth-client';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/entries', () => ({
  ...jest.requireActual<object>('./journal/entries'),
  readMealEntries: jest.fn(),
  readEntry: jest.fn(),
  updateEntry: jest.fn(() => true),
  deleteEntry: jest.fn(() => true),
}));

const userId = signedIn.data?.user.id;

const rice: Entry = {
  id: 'entry-rice',
  userId: userId ?? '',
  createdAt: new Date(2026, 10, 2, 19),
  updatedAt: new Date(2026, 10, 2, 19),
  deletedAt: null,
  date: '2026-11-02',
  mealType: 'dinner',
  foodId: 'food-rice',
  recipeId: null,
  label: 'Riz basmati cuit',
  grams: 250,
  portionLabel: null,
  kcal: 325,
  proteinG: 6.75,
  carbsG: 70,
  fatG: 1,
  loggedAt: new Date(2026, 10, 2, 19),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readMealEntries).mockReturnValue([rice]);
  jest.mocked(readEntry).mockReturnValue(rice);
});

async function open(url: Href) {
  setSession(signedIn);
  await renderRouter(
    { index: () => null, 'meal/[type]': MealSheet, 'entry/[id]': EntrySheet, add: () => null },
    { initialUrl: '/' },
  );
  await act(() => {
    router.push(url);
  });
}

describe('meal sheet', () => {
  it("lists the meal's entries with quantity, macros and calories", async () => {
    await open({ pathname: '/meal/[type]', params: { type: 'dinner', date: '2026-11-02' } });

    expect(await screen.findByRole('header', { name: 'Dîner' })).toBeOnTheScreen();
    expect(screen.getByText('1 aliment · 325 kcal')).toBeOnTheScreen();
    expect(screen.getByText('250 g · P 6,8 · G 70 · L 1')).toBeOnTheScreen();
    expect(readMealEntries).toHaveBeenCalledWith(expect.anything(), userId, '2026-11-02', 'dinner');
  });

  it('opens an entry, and the add sheet on this meal', async () => {
    await open({ pathname: '/meal/[type]', params: { type: 'dinner' } });

    await fireEvent.press(await screen.findByRole('button', { name: /^Riz basmati cuit,/ }));
    expect(screen).toHavePathname('/entry/entry-rice');

    await act(() => {
      router.back();
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un aliment' }));
    expect(screen).toHavePathname('/add');
    expect(screen).toHaveSearchParams({ meal: 'dinner' });
  });

  it('says when the meal is empty', async () => {
    jest.mocked(readMealEntries).mockReturnValue([]);
    await open({ pathname: '/meal/[type]', params: { type: 'lunch' } });

    expect(await screen.findByText('Plus rien dans ce repas.')).toBeOnTheScreen();
  });
});

describe('entry sheet', () => {
  const openEntry = () => open({ pathname: '/entry/[id]', params: { id: 'entry-rice' } });

  it('changes the quantity, with the values updated as it is typed', async () => {
    await openEntry();
    expect(await screen.findByText('325 kcal · P 6,8 · G 70 · L 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Quantité en grammes'), '100');
    expect(screen.getByText('130 kcal · P 2,7 · G 28 · L 0,4')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(updateEntry).toHaveBeenCalledWith(expect.anything(), userId, 'entry-rice', {
      grams: 100,
      mealType: 'dinner',
    });
    expect(screen).toHavePathname('/');
  });

  it('moves the entry to another meal', async () => {
    await openEntry();
    await fireEvent.press(await screen.findByRole('button', { name: 'Collation' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(updateEntry).toHaveBeenCalledWith(expect.anything(), userId, 'entry-rice', {
      grams: 250,
      mealType: 'snack',
    });
  });

  it('refuses a quantity of 0 g', async () => {
    await openEntry();
    await fireEvent.changeText(await screen.findByLabelText('Quantité en grammes'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Collation' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/La quantité doit être un nombre/);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it('deletes the entry after a confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await openEntry();
    await fireEvent.press(await screen.findByRole('button', { name: 'Supprimer de ce repas' }));

    expect(alert).toHaveBeenCalledWith(
      'Supprimer Riz basmati cuit ?',
      'Il sera retiré de ton journal.',
      expect.any(Array),
    );
    expect(deleteEntry).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    await act(() => {
      buttons.find((button) => button.style === 'destructive')?.onPress?.();
    });

    expect(deleteEntry).toHaveBeenCalledWith(expect.anything(), userId, 'entry-rice');
    expect(screen).toHavePathname('/');
  });

  it('says when the entry no longer exists', async () => {
    jest.mocked(readEntry).mockReturnValue(null);
    await openEntry();

    expect(await screen.findByText('Cet aliment n’est plus dans ton journal.')).toBeOnTheScreen();
  });
});
