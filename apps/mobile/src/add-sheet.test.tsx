import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import AddSheet from './app/add';
import { readFavoriteFoods, readLastGrams, readRecentFoods } from './foods/recents';
import { addEntries } from './journal/add-entries';
import { type Entry, readMealEntries } from './journal/entries';
import { copyEntries } from './journal/quick-entry';
import { useAddSelection } from './journal/selection-store';
import { setSession, signedIn } from './test/fake-auth-client';
import { mockFetchResponse } from './test/fetch';
import { basmati, complet, galettes } from './test/foods';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/add-entries', () => ({ addEntries: jest.fn() }));
jest.mock('./journal/quick-entry', () => ({
  ...jest.requireActual<object>('./journal/quick-entry'),
  copyEntries: jest.fn(),
}));
jest.mock('./journal/entries', () => ({
  ...jest.requireActual<object>('./journal/entries'),
  readMealEntries: jest.fn(() => []),
}));
jest.mock('./foods/recents', () => ({
  ...jest.requireActual<object>('./foods/recents'),
  readRecentFoods: jest.fn(),
  readFavoriteFoods: jest.fn(),
  readLastGrams: jest.fn(),
}));
jest.mock('./foods/local-search', () => ({ searchLocalFoods: jest.fn(() => []) }));

const userId = signedIn.data?.user.id;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readRecentFoods).mockReturnValue([
    { food: basmati, lastGrams: 250 },
    { food: galettes, lastGrams: 30 },
  ]);
  jest.mocked(readFavoriteFoods).mockReturnValue([{ food: complet, lastGrams: null }]);
  jest.mocked(readLastGrams).mockReturnValue(new Map([[basmati.id, 250]]));
});

/** Opens the sheet from Today, as the + of the tab bar does. */
async function openSheet(url: Href = '/add') {
  setSession(signedIn);
  await renderRouter(
    {
      index: () => null,
      add: AddSheet,
      'food/new': () => null,
      'food/[id]': () => null,
      'quick-add': () => null,
    },
    { initialUrl: '/' },
  );
  await act(() => {
    router.push(url);
  });
  await screen.findByRole('header', { name: 'Ajouter un aliment' });
}

const mealChip = (name: string) => screen.getByRole('button', { name });

describe('Ajouter un aliment', () => {
  it('adds a recent food in three touches: +, its + and "Ajouter"', async () => {
    await openSheet(); // touch 1: the + of the tab bar

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz basmati cuit' })); // 2
    expect(screen.getByText('250 g')).toBeOnTheScreen();
    expect(screen.getByText('1 aliment sélectionné')).toBeOnTheScreen();
    expect(screen.getByText('+ 325 kcal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter' })); // 3

    expect(addEntries).toHaveBeenCalledWith(expect.anything(), userId, {
      mealType: expect.any(String) as string,
      items: [{ food: basmati, grams: 250, portionLabel: null }],
      at: expect.any(Date) as Date,
    });
    expect(screen).toHavePathname('/');
  });

  it('opens the quantity sheet from the name of a food', async () => {
    await openSheet();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Choisir la quantité de Riz basmati cuit' }),
    );

    expect(screen).toHavePathname(`/food/${basmati.id}`);
  });

  it('shows the portion chosen in the quantity sheet', async () => {
    await openSheet();
    await act(() => {
      useAddSelection.getState().select({ food: basmati, grams: 150, portionLabel: '1 bol' });
    });

    expect(screen.getByText('1 bol')).toBeOnTheScreen();
    expect(screen.getByText('+ 195 kcal')).toBeOnTheScreen();
  });

  it("copies yesterday's meal in two touches", async () => {
    const entry = { id: 'yesterday-rice', label: 'Riz basmati cuit', kcal: 325 } as Entry;
    jest
      .mocked(readMealEntries)
      .mockReturnValue([entry, { ...entry, id: 'yesterday-2', kcal: 455 }]);
    await openSheet({ pathname: '/add', params: { meal: 'dinner' } });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Copier le dîner d’hier, 2 aliments, 780\u00a0kcal' }),
    );

    expect(copyEntries).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      [entry, expect.anything()],
      {
        mealType: 'dinner',
        at: expect.any(Date) as Date,
      },
    );
    expect(screen).toHavePathname('/');
    jest.mocked(readMealEntries).mockReturnValue([]);
  });

  it('hides the copy when yesterday has nothing for this meal', async () => {
    await openSheet();

    expect(screen.queryByText(/d’hier/)).not.toBeOnTheScreen();
  });

  it('opens the quick add on the same meal', async () => {
    await openSheet({ pathname: '/add', params: { meal: 'snack' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Ajout rapide' }));

    expect(screen).toHavePathname('/quick-add');
    expect(screen).toHaveSearchParams({ meal: 'snack' });
  });

  it('preselects the meal touched on Today', async () => {
    await openSheet({ pathname: '/add', params: { meal: 'snack' } });

    expect(mealChip('Collation')).toBeSelected();

    await fireEvent.press(mealChip('Dîner'));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Galettes de riz' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter' }));

    expect(jest.mocked(addEntries).mock.calls[0]?.[2].mealType).toBe('dinner');
  });

  it('adds several foods with their total', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz basmati cuit' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Galettes de riz' }));

    // 325 kcal + 30 g × 387 / 100 = 441 kcal.
    expect(screen.getByText('2 aliments sélectionnés')).toBeOnTheScreen();
    expect(screen.getByText('+ 441 kcal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Galettes de riz' }));
    expect(screen.getByText('1 aliment sélectionné')).toBeOnTheScreen();
  });

  it('shows the values per 100 g of each food', async () => {
    await openSheet();

    expect(screen.getByText('130 kcal · P 2,7 · G 28 / 100 g')).toBeOnTheScreen();
  });

  it('lists the favourites in their tab', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('tab', { name: 'Favoris' }));

    expect(screen.getByText('Riz complet cuit')).toBeOnTheScreen();
    expect(screen.queryByText('Riz basmati cuit')).not.toBeOnTheScreen();

    // Never eaten: 100 g by default.
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz complet cuit' }));
    expect(screen.getByText('100 g')).toBeOnTheScreen();
  });

  it('explains the empty tabs', async () => {
    jest.mocked(readRecentFoods).mockReturnValue([]);
    jest.mocked(readFavoriteFoods).mockReturnValue([]);
    await openSheet();

    expect(screen.getByText(/Les aliments que tu ajoutes apparaîtront ici/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Favoris' }));
    expect(screen.getByText(/Touche l’étoile d’un aliment/)).toBeOnTheScreen();
  });

  it('searches the server and keeps the last quantity of a known food', async () => {
    mockFetchResponse(200, { foods: [basmati, complet] });
    await openSheet();

    await fireEvent.changeText(screen.getByLabelText('Rechercher un aliment'), 'riz');

    expect(screen.getByText('Résultats pour « riz »')).toBeOnTheScreen();
    expect(await screen.findByText('Riz complet cuit')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz basmati cuit' }));
    expect(screen.getByText('250 g')).toBeOnTheScreen();
  });

  it('offers to create the food searched', async () => {
    mockFetchResponse(200, { foods: [] });
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText('Rechercher un aliment'), 'galette sarrasin');

    expect(
      await screen.findByText('Aucun aliment trouvé pour « galette sarrasin ».'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Créer « galette sarrasin »' }));

    expect(screen).toHavePathname('/food/new');
    expect(screen).toHaveSearchParams({ name: 'galette sarrasin' });
  });

  it('reports a failed save and keeps the selection', async () => {
    jest.mocked(addEntries).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    await openSheet();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz basmati cuit' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Les aliments n’ont pas pu être ajoutés. Réessaie.',
    );
    expect(screen).toHavePathname('/add');
  });
});
