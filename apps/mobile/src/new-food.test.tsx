import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import NewFoodScreen from './app/food/new';
import { createFood } from './foods/create-food';
import { setSession, signedIn } from './test/fake-auth-client';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./foods/create-food', () => ({ createFood: jest.fn(() => 'food-id') }));

const userId = signedIn.data?.user.id;

async function renderForm(initialUrl: Href = '/food/new') {
  setSession(signedIn);
  // Opened from a first screen, so that saving can go back to it.
  await renderRouter({ index: () => null, 'food/new': NewFoodScreen }, { initialUrl: '/' });
  await act(() => {
    router.push(initialUrl);
  });
  return screen.findByRole('header', { name: 'Nouvel aliment' });
}

async function typeValues(values: { kcal: string; protein: string; carbs: string; fat: string }) {
  await fireEvent.changeText(screen.getByLabelText('Calories, en kcal pour 100 g'), values.kcal);
  await fireEvent.changeText(screen.getByLabelText('Protéines, en g pour 100 g'), values.protein);
  await fireEvent.changeText(screen.getByLabelText('Glucides, en g pour 100 g'), values.carbs);
  await fireEvent.changeText(screen.getByLabelText('Lipides, en g pour 100 g'), values.fat);
}

const save = () => screen.getByRole('button', { name: "Enregistrer l'aliment" });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Nouvel aliment', () => {
  it('shows "Cohérent" for 162 kcal, P 6, G 30, L 2', async () => {
    await renderForm();
    await typeValues({ kcal: '162', protein: '6', carbs: '30', fat: '2' });

    expect(screen.getByText('Cohérent : 4×P + 4×G + 9×L = 162 kcal')).toBeOnTheScreen();
  });

  it('warns for 300 kcal with the same macros, without blocking the save', async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Galette');
    await typeValues({ kcal: '300', protein: '6', carbs: '30', fat: '2' });

    expect(
      screen.getByText(
        'À vérifier : 4×P + 4×G + 9×L = 162 kcal, loin des 300 kcal saisies. Tu peux enregistrer quand même.',
      ),
    ).toBeOnTheScreen();
    expect(save()).toBeEnabled();
  });

  it('keeps the save button disabled until the name and the values are typed', async () => {
    await renderForm();
    expect(save()).toBeDisabled();

    await typeValues({ kcal: '162', protein: '6', carbs: '30', fat: '2' });
    expect(save()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Galette de sarrasin');
    expect(save()).toBeEnabled();
  });

  it('prefills the name from the search', async () => {
    await renderForm('/food/new?name=Galette');

    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Galette');
  });

  it('saves the food with its portions and the favourite, then goes back', async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Galette de sarrasin');
    await fireEvent.changeText(screen.getByLabelText('Marque (optionnel)'), 'Maison');
    await typeValues({ kcal: '162', protein: '6', carbs: '30', fat: '2' });

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter une portion' }));
    const confirm = screen.getByRole('button', { name: 'Ajouter la portion' });
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Nom de la portion'), '1 galette');
    await fireEvent.changeText(screen.getByLabelText('Poids en grammes'), '50');
    await fireEvent.press(confirm);
    expect(screen.getByText('1 galette = 50 g')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('switch', { name: 'Favori' }));
    expect(screen.getByRole('switch', { name: 'Favori' })).toBeChecked();

    await fireEvent.press(save());

    expect(createFood).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      {
        name: 'Galette de sarrasin',
        brand: 'Maison',
        kcal100g: 162,
        protein100g: 6,
        carbs100g: 30,
        fat100g: 2,
        portions: [{ label: '1 galette', grams: 50 }],
      },
      { favorite: true },
    );
    expect(screen).toHavePathname('/');
  });

  it('removes a portion when its chip is touched', async () => {
    await renderForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter une portion' }));
    await fireEvent.changeText(screen.getByLabelText('Nom de la portion'), '1 pot');
    await fireEvent.changeText(screen.getByLabelText('Poids en grammes'), '125');
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter la portion' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Retirer la portion 1 pot = 125 g' }));

    expect(screen.queryByText('1 pot = 125 g')).not.toBeOnTheScreen();
  });

  it('explains why the values cannot be saved', async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Huile');
    await typeValues({ kcal: '900', protein: '40', carbs: '50', fat: '11' });

    await fireEvent.press(save());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Protéines, glucides et lipides dépassent 100 g pour 100 g.',
    );
    expect(createFood).not.toHaveBeenCalled();
  });

  it('reports a failed save and stays on the form', async () => {
    jest.mocked(createFood).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    await renderForm();
    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Galette');
    await typeValues({ kcal: '162', protein: '6', carbs: '30', fat: '2' });

    await fireEvent.press(save());

    expect(screen.getByRole('alert')).toHaveTextContent(
      "L'aliment n'a pas pu être enregistré. Réessaie.",
    );
    expect(screen).toHavePathname('/food/new');
  });
});
