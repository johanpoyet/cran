import { act, fireEvent, screen } from '@testing-library/react-native';
import { type Href, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { ActionSheetIOS, Alert } from 'react-native';

import AddSheet from './app/add';
import { readFavoriteFoods, readLastGrams, readRecentFoods } from './foods/recents';
import { addEntries } from './journal/add-entries';
import { type Entry, readMealEntries } from './journal/entries';
import { copyEntries } from './journal/quick-entry';
import { useAddSelection } from './journal/selection-store';
import { readRecentRecipes } from './recipes/log';
import { readRecipes, type RecipeDetail } from './recipes/recipes';
import {
  applyTemplate,
  deleteTemplate,
  type MealTemplate,
  readTemplates,
  renameTemplate,
} from './templates/templates';
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
jest.mock('./recipes/recipes', () => ({
  ...jest.requireActual<object>('./recipes/recipes'),
  readRecipes: jest.fn(() => []),
}));
jest.mock('./templates/templates', () => ({
  ...jest.requireActual<object>('./templates/templates'),
  readTemplates: jest.fn(() => []),
  applyTemplate: jest.fn(),
  renameTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
}));
jest.mock('./recipes/log', () => ({
  ...jest.requireActual<object>('./recipes/log'),
  readRecentRecipes: jest.fn(() => []),
}));

// "Riz au lait maison" of mockup 11: 173 kcal per serving.
const rizAuLait: RecipeDetail = {
  id: 'recipe-riz-au-lait',
  name: 'Riz au lait maison',
  category: 'snack',
  servings: 4,
  cookedWeightG: 800,
  notes: null,
  ingredientCount: 0,
  ingredients: [],
  total: { kcal: 692, proteinG: 24, carbsG: 120, fatG: 12 },
  perServing: { kcal: 173, proteinG: 6, carbsG: 30, fatG: 3 },
  servingWeightG: 200,
};

const userId = signedIn.data?.user.id;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readRecentFoods).mockReturnValue([
    { food: basmati, lastGrams: 250 },
    { food: galettes, lastGrams: 30 },
  ]);
  jest.mocked(readFavoriteFoods).mockReturnValue([{ food: complet, lastGrams: null }]);
  jest.mocked(readLastGrams).mockReturnValue(new Map([[basmati.id, 250]]));
  jest.mocked(readRecentRecipes).mockReturnValue([]);
  jest.mocked(readRecipes).mockReturnValue([]);
  jest.mocked(readTemplates).mockReturnValue([]);
});

// Templates of mockup 11.
const dinnerTemplate: MealTemplate = {
  id: 'template-dinner',
  name: 'Dîner prise de masse',
  mealType: 'dinner',
  items: [
    { food: basmati, grams: 250 },
    { food: galettes, grams: 30 },
    { recipe: rizAuLait, amount: { servings: 1 } },
    { food: complet, grams: 100 },
  ],
  kcal: 780,
};
const shakerTemplate: MealTemplate = {
  id: 'template-shaker',
  name: 'Shaker post-séance',
  mealType: 'snack',
  items: [
    { food: basmati, grams: 100 },
    { food: complet, grams: 100 },
  ],
  kcal: 320,
};

/** Opens the sheet from Today, as the + of the tab bar does. */
async function openSheet(url: Href = '/add') {
  setSession(signedIn);
  await renderRouter(
    {
      index: () => null,
      add: AddSheet,
      'food/new': () => null,
      'food/[id]': () => null,
      'recipes/log': () => null,
      'quick-add': () => null,
      scan: () => null,
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

  it('opens the scan for the selected meal', async () => {
    await openSheet({ pathname: '/add', params: { meal: 'dinner' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Scanner un code-barres' }));

    expect(screen).toHavePathname('/scan');
    expect(screen).toHaveSearchParams({ meal: 'dinner' });
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

  it('adds a recent recipe, one serving by default, with the foods (S6-2, mockup 11)', async () => {
    jest.mocked(readRecentRecipes).mockReturnValue([rizAuLait]);
    await openSheet();

    expect(screen.getByText('Ma recette · 173 kcal / portion')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz basmati cuit' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ajouter Riz au lait maison' }));
    expect(screen.getByText('1 part')).toBeOnTheScreen();
    expect(screen.getByText('2 aliments sélectionnés')).toBeOnTheScreen();
    expect(screen.getByText('+ 498 kcal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter' }));
    expect(addEntries).toHaveBeenCalledWith(expect.anything(), userId, {
      mealType: expect.any(String) as unknown,
      items: [
        { food: basmati, grams: 250, portionLabel: null },
        { recipe: rizAuLait, amount: { servings: 1 } },
      ],
      at: expect.any(Date) as unknown,
    });
  });

  it('shows the servings or the weight chosen in the recipe sheet', async () => {
    jest.mocked(readRecentRecipes).mockReturnValue([rizAuLait]);
    await openSheet();

    await act(() => {
      useAddSelection.getState().selectRecipe({ recipe: rizAuLait, amount: { grams: 300 } });
    });
    expect(screen.getByText('300 g')).toBeOnTheScreen();
    expect(screen.getByText('+ 260 kcal')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Choisir la quantité de Riz au lait maison' }),
    );
    expect(screen).toHavePathname('/recipes/log');
    expect(screen).toHaveSearchParams({ id: rizAuLait.id, select: '1' });
  });

  it('finds the recipes matching the search', async () => {
    jest
      .mocked(readRecipes)
      .mockReturnValue([rizAuLait, { ...rizAuLait, id: 'recipe-curry', name: 'Poulet curry' }]);
    await openSheet();

    await fireEvent.changeText(screen.getByLabelText('Rechercher un aliment'), 'riz');

    expect(await screen.findByText('Riz au lait maison')).toBeOnTheScreen();
    expect(screen.queryByText('Poulet curry')).not.toBeOnTheScreen();
  });

  it('adds a template in two touches: + and its card (S6-3)', async () => {
    jest.mocked(readTemplates).mockReturnValue([dinnerTemplate, shakerTemplate]);
    await openSheet({ pathname: '/add', params: { meal: 'lunch' } });

    expect(screen.getByRole('header', { name: 'Modèles de repas' })).toBeOnTheScreen();
    expect(screen.getByText('4 aliments · 780 kcal')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Modèle Dîner prise de masse, 4 aliments · 780 kcal' }),
    );

    expect(applyTemplate).toHaveBeenCalledWith(expect.anything(), userId, dinnerTemplate, {
      mealType: 'lunch',
      at: expect.any(Date) as unknown,
    });
    expect(screen).toHavePathname('/');
  });

  it('shows the templates of the chosen meal first', async () => {
    jest.mocked(readTemplates).mockReturnValue([dinnerTemplate, shakerTemplate]);
    await openSheet({ pathname: '/add', params: { meal: 'snack' } });

    const names = screen
      .getAllByRole('button', { name: /^Modèle / })
      .map((card) => String(card.props.accessibilityLabel));
    expect(names[0]).toMatch(/Shaker post-séance/);
  });

  it('renames or deletes a template from its menu', async () => {
    jest.mocked(readTemplates).mockReturnValue([dinnerTemplate]);
    const menu = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementationOnce((options, callback) => {
        expect(options.options).toEqual(['Renommer', 'Supprimer', 'Annuler']);
        callback(0);
      })
      .mockImplementationOnce((_options, callback) => {
        callback(1);
      });
    const prompt = jest.spyOn(Alert, 'prompt').mockImplementation((_title, _message, buttons) => {
      if (Array.isArray(buttons)) buttons[1]?.onPress?.('Dîner du soir');
    });
    const confirm = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    await openSheet();
    const card = screen.getByRole('button', { name: /^Modèle Dîner prise de masse/ });

    await fireEvent(card, 'longPress');
    expect(renameTemplate).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      dinnerTemplate.id,
      'Dîner du soir',
    );
    await fireEvent(card, 'longPress');
    expect(deleteTemplate).toHaveBeenCalledWith(expect.anything(), userId, dinnerTemplate.id);
    expect(menu).toHaveBeenCalledTimes(2);
    expect(applyTemplate).not.toHaveBeenCalled();
    [menu, prompt, confirm].forEach((spy) => {
      spy.mockRestore();
    });
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
