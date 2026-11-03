import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import QuantitySheet from './app/food/[id]';
import { isFavorite, setFavorite } from './foods/favorite';
import { readPortions } from './foods/portions';
import { readFood, readLastGrams } from './foods/recents';
import { useAddSelection } from './journal/selection-store';
import { setSession, signedIn } from './test/fake-auth-client';
import { basmati } from './test/foods';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./foods/recents', () => ({
  ...jest.requireActual<object>('./foods/recents'),
  readFood: jest.fn(() => null),
  readLastGrams: jest.fn(() => new Map()),
}));
jest.mock('./foods/portions', () => ({ readPortions: jest.fn(() => []) }));
jest.mock('./foods/favorite', () => ({ isFavorite: jest.fn(() => false), setFavorite: jest.fn() }));

const userId = signedIn.data?.user.id;

beforeEach(() => {
  jest.clearAllMocks();
  useAddSelection.getState().clear();
  useAddSelection.getState().show([basmati]);
  jest.mocked(readPortions).mockReturnValue([{ label: '1 bol', grams: 150 }]);
  jest.mocked(readLastGrams).mockReturnValue(new Map());
  jest.mocked(readFood).mockReturnValue(null);
});

async function openSheet(id = basmati.id) {
  setSession(signedIn);
  await renderRouter({ index: () => null, 'food/[id]': QuantitySheet }, { initialUrl: '/' });
  await act(() => {
    router.push({ pathname: '/food/[id]', params: { id } });
  });
}

const gramsField = () => screen.getByLabelText('Quantité en grammes');

describe('quantity sheet', () => {
  it('prefills the last quantity used and shows its values', async () => {
    jest.mocked(readLastGrams).mockReturnValue(new Map([[basmati.id, 250]]));
    await openSheet();

    expect(await screen.findByRole('header', { name: 'Riz basmati cuit' })).toBeOnTheScreen();
    expect(screen.getByText('130 kcal pour 100 g')).toBeOnTheScreen();
    expect(gramsField()).toHaveDisplayValue('250');
    expect(screen.getByText('325 kcal')).toBeOnTheScreen();
    expect(screen.getByText('Protéines 6,8 g')).toBeOnTheScreen();
  });

  it('updates the values as the quantity is typed', async () => {
    await openSheet();
    expect(gramsField()).toHaveDisplayValue('100');

    await fireEvent.changeText(gramsField(), '50');

    expect(screen.getByText('65 kcal')).toBeOnTheScreen();
    expect(screen.getByText('Glucides 14 g')).toBeOnTheScreen();
  });

  it('selects the food with a named portion in the add sheet', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: '1 bol · 150 g' }));
    expect(gramsField()).toHaveDisplayValue('150');
    expect(screen.getByText('195 kcal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Valider' }));

    expect(useAddSelection.getState().selected.get(basmati.id)).toEqual({
      food: basmati,
      grams: 150,
      portionLabel: '1 bol',
    });
    expect(screen).toHavePathname('/');
  });

  it('offers the usual portion of the food and 100 g', async () => {
    useAddSelection.getState().show([{ ...basmati, defaultPortionG: 125 }]);
    await openSheet();

    await fireEvent.press(screen.getByRole('button', { name: '1 portion · 125 g' }));
    expect(gramsField()).toHaveDisplayValue('125');
    await fireEvent.press(screen.getByRole('button', { name: '100 g' }));
    expect(gramsField()).toHaveDisplayValue('100');
  });

  it('forgets the portion once grams are typed', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: '1 bol · 150 g' }));
    await fireEvent.changeText(gramsField(), '180');
    await fireEvent.press(screen.getByRole('button', { name: 'Valider' }));

    expect(useAddSelection.getState().selected.get(basmati.id)).toMatchObject({
      grams: 180,
      portionLabel: null,
    });
  });

  it('refuses a quantity of 0 g', async () => {
    await openSheet();
    await fireEvent.changeText(gramsField(), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Valider' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/La quantité doit être un nombre/);
    expect(useAddSelection.getState().selected.size).toBe(0);
  });

  it('stars the food', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('switch', { name: 'Favori' }));

    expect(setFavorite).toHaveBeenCalledWith(expect.anything(), userId, basmati, true);
    expect(isFavorite).toHaveBeenCalledWith(expect.anything(), userId, basmati.id);
  });

  it('reads a food of the phone that the add sheet did not show', async () => {
    useAddSelection.getState().clear();
    jest.mocked(readFood).mockReturnValue(basmati);
    await openSheet();

    expect(await screen.findByRole('header', { name: 'Riz basmati cuit' })).toBeOnTheScreen();
  });

  it('says when the food is not available', async () => {
    useAddSelection.getState().clear();
    await openSheet('unknown');

    expect(await screen.findByText('Cet aliment n’est plus disponible.')).toBeOnTheScreen();
  });
});
