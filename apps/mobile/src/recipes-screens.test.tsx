import type { Food } from '@cran/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import ProfileScreen from './app/(tabs)/profile';
import RecipeScreen from './app/recipes/[id]';
import RecipeFormScreen from './app/recipes/edit';
import RecipesScreen from './app/recipes/index';
import IngredientSheet from './app/recipes/ingredient';
import * as schema from './db/schema';
import type { LocalDatabase } from './db/types';
import { setSession, signedIn } from './test/fake-auth-client';
import { mockFetchResponse } from './test/fetch';
import { food } from './test/foods';
import { createLocalDatabase } from './test/local-database';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));
// The screens use a real local database (sql.js), created for each test.
const mockDb: { current: LocalDatabase | null } = { current: null };
jest.mock('./db/client', () => ({
  get localDb() {
    return mockDb.current;
  },
}));

const userId = signedIn.data?.user.id ?? '';

// "Poulet riz curry" of mockup 15, as foods of the user (found by the search of the phone).
const mine = (values: Partial<Food> & Pick<Food, 'id' | 'name'>) =>
  food({ ...values, source: 'user', sourceRef: null });
const poulet = mine({
  id: '0192f0c0-0000-7000-8000-000000000001',
  name: 'Blanc de poulet',
  kcal100g: 120,
  protein100g: 23,
  carbs100g: 0,
  fat100g: 1.5,
});
const riz = mine({
  id: '0192f0c0-0000-7000-8000-000000000002',
  name: 'Riz basmati',
  kcal100g: 350,
  protein100g: 7.5,
  carbs100g: 78,
  fat100g: 0.9,
});
const brocolis = mine({
  id: '0192f0c0-0000-7000-8000-000000000003',
  name: 'Brocolis',
  kcal100g: 34,
  protein100g: 2.8,
  carbs100g: 7,
  fat100g: 0.4,
});
const coco = mine({
  id: '0192f0c0-0000-7000-8000-000000000004',
  name: 'Lait de coco léger',
  kcal100g: 70,
  protein100g: 0.7,
  carbs100g: 2.5,
  fat100g: 6,
});
const curry = mine({
  id: '0192f0c0-0000-7000-8000-000000000005',
  name: 'Pâte de curry',
  kcal100g: 250,
  protein100g: 5,
  carbs100g: 20,
  fat100g: 15,
});

beforeEach(async () => {
  jest.restoreAllMocks();
  mockDb.current = await createLocalDatabase();
  mockDb.current
    .insert(schema.foods)
    .values([poulet, riz, brocolis, coco, curry].map((item) => ({ ...item, ownerId: userId })))
    .run();
  mockFetchResponse(200, { foods: [] });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const button = (name: string | RegExp) => screen.getByRole('button', { name });

async function openApp() {
  setSession(signedIn);
  await renderRouter(
    {
      index: ProfileScreen,
      'recipes/index': RecipesScreen,
      'recipes/[id]': RecipeScreen,
      'recipes/edit': RecipeFormScreen,
      'recipes/ingredient': IngredientSheet,
    },
    { initialUrl: '/' },
  );
}

/** Adds an ingredient from the sheet: search, pick, grams, raw or not. */
async function addIngredient(name: string, grams: string, raw: boolean) {
  await fireEvent.press(button('+ Ajouter un ingrédient'));
  await fireEvent.changeText(screen.getByLabelText('Rechercher un aliment'), name);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  await fireEvent.press(button(`Choisir ${name}`));
  await fireEvent.changeText(
    screen.getByLabelText('Quantité en grammes, pour toute la recette'),
    grams,
  );
  const rawSwitch = screen.getByRole('switch', { name: 'Pesé cru' });
  if ((rawSwitch.props as { value?: boolean }).value !== raw)
    await fireEvent(rawSwitch, 'valueChange', raw);
  await fireEvent.press(button('Ajouter à la recette'));
}

describe('Mes recettes', () => {
  it('creates the "Poulet riz curry" and shows about 614 kcal per serving (S6-1)', async () => {
    await openApp();
    await fireEvent.press(button('Mes recettes'));
    expect(screen.getByText(/Tu n’as pas encore de recette/)).toBeOnTheScreen();

    await fireEvent.press(button('Nouvelle recette'));
    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Poulet riz curry');
    await fireEvent.press(button('Meal prep'));
    expect(button('Enregistrer la recette')).toBeDisabled();
    await addIngredient('Blanc de poulet', '800', true);
    await addIngredient('Riz basmati', '320', true);
    await addIngredient('Brocolis', '400', false);
    await addIngredient('Lait de coco léger', '200', false);
    await addIngredient('Pâte de curry', '40', false);
    expect(screen.getAllByText('CRU')).toHaveLength(2);

    await fireEvent.press(button('Enregistrer la recette'));

    expect(screen.getByRole('header', { name: 'Poulet riz curry' })).toBeOnTheScreen();
    expect(screen.getByText('Meal prep · 5 ingrédients')).toBeOnTheScreen();
    expect(screen.getByLabelText('614 kcal par part')).toBeOnTheScreen();
    expect(screen.getByText('960 kcal · P 184 g')).toBeOnTheScreen();

    // Back on the list.
    await act(() => {
      router.back();
    });
    expect(screen.getByText('Poulet riz curry')).toBeOnTheScreen();
    expect(screen.getByText('614')).toBeOnTheScreen();
    expect(screen.getByText('Meal prep · 4 parts')).toBeOnTheScreen();
  });

  it('changes the servings and the cooked weight from the sheet', async () => {
    await openApp();
    await createCurry();

    await fireEvent.press(button('Une part de plus'));
    expect(screen.getByLabelText('491 kcal par part')).toBeOnTheScreen();
    await fireEvent.press(button('Une part de moins'));

    const weight = screen.getByLabelText('Poids total une fois cuit, en grammes');
    await fireEvent.changeText(weight, '2100');
    await fireEvent(weight, 'endEditing');

    expect(screen.getByText(/dans ton tup/)).toHaveTextContent(
      '1 portion = 525 g dans ton tup — pèse ta part, l’app calcule le reste.',
    );
  });

  it('edits the ingredients of a recipe', async () => {
    await openApp();
    await createCurry();

    await fireEvent.press(button('Modifier la recette'));
    await fireEvent.press(button(/^Pâte de curry/));
    await fireEvent.press(button('Retirer de la recette'));
    await fireEvent.press(button(/^Riz basmati/));
    await fireEvent.changeText(
      screen.getByLabelText('Quantité en grammes, pour toute la recette'),
      '400',
    );
    await fireEvent.press(button('Valider'));
    await fireEvent.press(button('Enregistrer la recette'));

    expect(screen.getByText('Meal prep · 4 ingrédients')).toBeOnTheScreen();
    expect(screen.queryByText('Pâte de curry')).toBeNull();
    expect(screen.getByLabelText(/^Riz basmati, 400\sg pesé cru/)).toBeOnTheScreen();
  });

  it('filters the recipes by name and category', async () => {
    await openApp();
    await createCurry();
    await act(() => {
      router.back();
    });

    await fireEvent.press(button('Petit-déj'));
    expect(screen.queryByText('Poulet riz curry')).toBeNull();
    await fireEvent.press(button('Tout'));
    await fireEvent.changeText(screen.getByLabelText('Rechercher une recette'), 'pates');
    expect(screen.getByText('Aucune recette pour « pates ».')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Rechercher une recette'), 'POULET');
    expect(screen.getByText('Poulet riz curry')).toBeOnTheScreen();
  });

  it('deletes a recipe after a confirmation', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _text, buttons?: AlertButton[]) => {
      buttons?.find((item) => item.style === 'destructive')?.onPress?.();
    });
    await openApp();
    await createCurry();

    await fireEvent.press(button('Modifier la recette'));
    await fireEvent.press(button('Supprimer la recette'));

    expect(screen).toHavePathname('/recipes');
    expect(screen.getByText(/Tu n’as pas encore de recette/)).toBeOnTheScreen();
  });
});

/** The recipe of mockup 15, created through the screens; ends on its sheet. */
async function createCurry() {
  await fireEvent.press(button('Mes recettes'));
  await fireEvent.press(button('Nouvelle recette'));
  await fireEvent.changeText(screen.getByLabelText('Nom'), 'Poulet riz curry');
  await fireEvent.press(button('Meal prep'));
  await addIngredient('Blanc de poulet', '800', true);
  await addIngredient('Riz basmati', '320', true);
  await addIngredient('Brocolis', '400', false);
  await addIngredient('Lait de coco léger', '200', false);
  await addIngredient('Pâte de curry', '40', false);
  await fireEvent.press(button('Enregistrer la recette'));
}
