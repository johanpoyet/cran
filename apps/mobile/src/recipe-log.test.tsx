import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router, Tabs } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { ActionSheetIOS, Text } from 'react-native';

import RecipeScreen from './app/recipes/[id]';
import RecipeLogSheet from './app/recipes/log';
import type { LocalDatabase } from './db/types';
import { readMealEntries } from './journal/entries';
import { useAddSelection } from './journal/selection-store';
import { readRecipe, type RecipeDetail, saveRecipe } from './recipes/recipes';
import { setSession, signedIn } from './test/fake-auth-client';
import { createLocalDatabase } from './test/local-database';
import { curry, foods } from './test/recipes';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
// The screens use a real local database (sql.js), created for each test.
const mockDb: { current: LocalDatabase | null } = { current: null };
jest.mock('./db/client', () => ({
  get localDb() {
    return mockDb.current;
  },
}));

const userId = signedIn.data?.user.id ?? '';
// 12:30: lunch time.
const now = new Date(2026, 10, 5, 12, 30);

let db: LocalDatabase;
let cooked: RecipeDetail;
let uncooked: RecipeDetail;

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.useFakeTimers({ now });
  db = await createLocalDatabase();
  mockDb.current = db;
  // "Poulet riz curry" of mockup 15: 614 kcal per serving, 2 100 g once cooked (525 g a serving).
  cooked = saved({ ...curry, cookedWeightG: 2100 });
  uncooked = saved({ ...curry, name: 'Curry sans pesée' });
  useAddSelection.getState().clear();
});

afterEach(() => {
  jest.useRealTimers();
});

function saved(input: typeof curry): RecipeDetail {
  const recipe = readRecipe(db, userId, saveRecipe(db, userId, input, foods));
  if (!recipe) throw new Error('Recipe not saved');
  return recipe;
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const lunch = () => readMealEntries(db, userId, '2026-11-05', 'lunch');

async function open(url: Href) {
  setSession(signedIn);
  await renderRouter(
    {
      index: () => <Text>Aujourd’hui</Text>,
      add: () => null,
      'recipes/[id]': RecipeScreen,
      'recipes/log': RecipeLogSheet,
    },
    { initialUrl: '/' },
  );
  await act(() => {
    router.push(url);
  });
}

const openRecipe = (recipe: RecipeDetail) =>
  open({ pathname: '/recipes/[id]', params: { id: recipe.id } });

describe('logging a recipe (S6-2)', () => {
  it('adds 1 serving in two touches from the recipe, to the meal of the hour', async () => {
    await openRecipe(cooked);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ajouter 1 part · 614 kcal' }));
    expect(screen).toHavePathname('/recipes/log');
    expect(button('1 part')).toBeSelected();
    expect(screen.getByText('614 kcal par part · 1 part = 525 g')).toBeOnTheScreen();
    await fireEvent.press(button('Ajouter · 614 kcal'));

    expect(lunch()).toEqual([
      expect.objectContaining({ recipeId: cooked.id, servings: 1, grams: 525 }),
    ]);
    expect(screen).toHavePathname('/');
    expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
  });

  it('goes back to Today from the recipes opened in Profile', async () => {
    setSession(signedIn);
    await renderRouter(
      {
        '(tabs)/_layout': () => (
          <Tabs>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="profile" />
          </Tabs>
        ),
        '(tabs)/index': () => <Text>Aujourd’hui</Text>,
        '(tabs)/profile': () => <Text>Profil</Text>,
        'recipes/[id]': RecipeScreen,
        'recipes/log': RecipeLogSheet,
      },
      { initialUrl: '/profile' },
    );
    await act(() => {
      router.push({ pathname: '/recipes/[id]', params: { id: cooked.id } });
    });

    await fireEvent.press(await screen.findByRole('button', { name: 'Ajouter 1 part · 614 kcal' }));
    await fireEvent.press(button('Ajouter · 614 kcal'));

    expect(screen).toHavePathname('/');
    expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
  });

  it('adds n servings, typed by hand', async () => {
    await open({ pathname: '/recipes/log', params: { id: cooked.id } });

    await fireEvent.press(await screen.findByRole('button', { name: '2 parts' }));
    expect(button('Ajouter · 1 228 kcal')).toBeOnTheScreen();
    await fireEvent.press(button('Autre…'));
    await fireEvent.changeText(screen.getByLabelText('Nombre de parts'), '1,5');
    await fireEvent.press(button('Ajouter · 921 kcal'));

    expect(lunch()).toEqual([expect.objectContaining({ servings: 1.5, grams: 787.5 })]);
  });

  it('weighs the portion: "Peser ma part" opens the sheet on the weight', async () => {
    await openRecipe(cooked);

    await fireEvent.press(await screen.findByRole('button', { name: 'Peser ma part' }));
    expect(button('Peser')).toBeSelected();
    expect(button(/^Ajouter ·/)).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Poids de ta part en grammes'), '300');
    // 2 456 kcal × 300 / 2 100.
    await fireEvent.press(button('Ajouter · 351 kcal'));

    expect(lunch()).toEqual([expect.objectContaining({ grams: 300, servings: null })]);
  });

  it('refuses a quantity out of bounds', async () => {
    await open({ pathname: '/recipes/log', params: { id: cooked.id, weigh: '1' } });

    await fireEvent.changeText(await screen.findByLabelText('Poids de ta part en grammes'), '6000');

    expect(screen.getByRole('alert')).toHaveTextContent(/Le poids doit être/);
    expect(button(/^Ajouter ·/)).toBeDisabled();
  });

  it('adds to another meal', async () => {
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => {
        callback(3);
      });
    await open({ pathname: '/recipes/log', params: { id: cooked.id } });

    await fireEvent.press(await screen.findByRole('button', { name: 'Ajouter à : Déjeuner' }));
    await fireEvent.press(button('Ajouter · 614 kcal'));

    expect(readMealEntries(db, userId, '2026-11-05', 'dinner')).toHaveLength(1);
  });

  it('cannot weigh a recipe without a cooked weight', async () => {
    await openRecipe(uncooked);

    expect(
      await screen.findByRole('button', { name: 'Ajouter 1 part · 614 kcal' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Peser ma part' })).toBeNull();

    await fireEvent.press(button('Ajouter 1 part · 614 kcal'));
    expect(screen.getByText('614 kcal par part')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Peser' })).toBeNull();
    await fireEvent.press(button('Ajouter · 614 kcal'));

    expect(lunch()).toEqual([expect.objectContaining({ servings: 1, grams: null })]);
  });

  it('from the add sheet, changes the selected recipe instead of adding it', async () => {
    useAddSelection.getState().selectRecipe({ recipe: cooked, amount: { servings: 1 } });
    await open({ pathname: '/recipes/log', params: { id: cooked.id, select: '1' } });

    expect(await screen.findByRole('button', { name: '1 part' })).toBeSelected();
    expect(screen.queryByRole('button', { name: /^Ajouter à/ })).toBeNull();
    await fireEvent.press(button('Peser'));
    await fireEvent.changeText(screen.getByLabelText('Poids de ta part en grammes'), '400');
    await fireEvent.press(button('Valider'));

    expect(useAddSelection.getState().recipes.get(cooked.id)?.amount).toEqual({ grams: 400 });
    expect(lunch()).toEqual([]);
    expect(screen).toHavePathname('/');
  });

  it('says when the recipe no longer exists', async () => {
    await open({ pathname: '/recipes/log', params: { id: 'gone' } });

    expect(await screen.findByText('Cette recette n’existe plus.')).toBeOnTheScreen();
  });
});
