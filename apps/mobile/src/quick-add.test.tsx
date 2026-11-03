import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import QuickAddSheet from './app/quick-add';
import { addQuickEntry } from './journal/quick-entry';
import { setSession, signedIn } from './test/fake-auth-client';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/quick-entry', () => ({
  ...jest.requireActual<object>('./journal/quick-entry'),
  addQuickEntry: jest.fn(),
}));

const userId = signedIn.data?.user.id;

beforeEach(() => {
  jest.clearAllMocks();
});

async function openSheet(url: Href = { pathname: '/quick-add', params: { meal: 'dinner' } }) {
  setSession(signedIn);
  await renderRouter({ index: () => null, 'quick-add': QuickAddSheet }, { initialUrl: '/' });
  await act(() => {
    router.push(url);
  });
  await screen.findByRole('header', { name: 'Ajout rapide' });
}

const save = () => screen.getByRole('button', { name: 'Ajouter' });

describe('quick add', () => {
  it('adds calories alone to the meal, the macros being 0', async () => {
    await openSheet();
    expect(save()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dîner' })).toBeSelected();

    await fireEvent.changeText(screen.getByLabelText('Calories, en kcal'), '850');
    await fireEvent.press(save());

    expect(addQuickEntry).toHaveBeenCalledWith(expect.anything(), userId, {
      mealType: 'dinner',
      entry: { label: '', kcal: 850, proteinG: 0, carbsG: 0, fatG: 0 },
      label: 'Ajout rapide',
      at: expect.any(Date) as Date,
    });
    expect(screen).toHavePathname('/');
  });

  it('keeps a name, macros with commas and another meal', async () => {
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText('Nom (optionnel)'), 'Resto');
    await fireEvent.changeText(screen.getByLabelText('Calories, en kcal'), '900');
    await fireEvent.changeText(screen.getByLabelText('Protéines, en g'), '40,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Déjeuner' }));
    await fireEvent.press(save());

    expect(jest.mocked(addQuickEntry).mock.calls[0]?.[2]).toMatchObject({
      mealType: 'lunch',
      entry: { label: 'Resto', kcal: 900, proteinG: 40.5, carbsG: 0, fatG: 0 },
    });
  });

  it('refuses values that are not numbers', async () => {
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText('Calories, en kcal'), '900');
    await fireEvent.changeText(screen.getByLabelText('Lipides, en g'), 'beaucoup');
    await fireEvent.press(save());

    expect(screen.getByRole('alert')).toHaveTextContent(/Les calories doivent être un nombre/);
    expect(addQuickEntry).not.toHaveBeenCalled();
  });
});
