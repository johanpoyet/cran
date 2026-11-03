import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import TodayScreen from './app/(tabs)/index';
import { readToday, type TodaySummary } from './journal/today';
import { addWater } from './journal/water';
import { setSession, signedIn } from './test/fake-auth-client';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/today', () => ({ readToday: jest.fn() }));
jest.mock('./journal/water', () => ({ addWater: jest.fn() }));

// Values of the "Aujourd'hui" mockup.
const mockup: TodaySummary = {
  target: {
    kcal: 2900,
    proteinG: 150,
    carbsG: 381,
    fatG: 86,
    surplusKcal: 250,
    trainingDay: false,
  },
  eaten: { kcal: 2140, proteinG: 128.4, carbsG: 265, fatG: 62 },
  water: { totalMl: 1500, goalMl: 3000 },
  meals: [
    { mealType: 'breakfast', count: 3, kcal: 640, firstLoggedAt: new Date(2026, 9, 27, 8, 10) },
    { mealType: 'lunch', count: 3, kcal: 820, firstLoggedAt: new Date(2026, 9, 27, 12, 45) },
    { mealType: 'snack', count: 2, kcal: 680, firstLoggedAt: new Date(2026, 9, 27, 16, 30) },
    { mealType: 'dinner', count: 0, kcal: 0, firstLoggedAt: null },
  ],
};

async function renderToday(summary: TodaySummary) {
  jest.mocked(readToday).mockReturnValue(summary);
  setSession(signedIn);
  await renderRouter(
    {
      index: TodayScreen,
      add: () => null,
      'meal/[type]': () => null,
      journal: () => null,
      water: () => null,
    },
    { initialUrl: '/' },
  );
}

describe('Ta journée', () => {
  it('shows what is left to eat, as on the mockup', async () => {
    await renderToday(mockup);

    expect(screen.getByText('Il te reste')).toBeOnTheScreen();
    expect(screen.getByText('760\u00a0kcal')).toBeOnTheScreen();
    expect(screen.getByText('Surplus +250')).toBeOnTheScreen();
    expect(screen.getByText('2\u202f140 mangées')).toBeOnTheScreen();
    expect(screen.getByText('Objectif 2\u202f900')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: /mangées sur un objectif/ }),
    ).toHaveAccessibilityValue({ now: 74 });
  });

  it('shows the grams eaten of each macro against its target', async () => {
    await renderToday(mockup);

    expect(screen.getByLabelText('Protéines : 128\u00a0g sur 150\u00a0g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Glucides : 265\u00a0g sur 381\u00a0g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lipides : 62\u00a0g sur 86\u00a0g')).toBeOnTheScreen();
  });

  it('lists the four meals, with count, time and calories', async () => {
    await renderToday(mockup);

    expect(screen.getByText('Petit-déjeuner')).toBeOnTheScreen();
    expect(screen.getAllByText('3 aliments · 8h10')).toHaveLength(1);
    expect(screen.getByText('640')).toBeOnTheScreen();
    expect(screen.getByText('2 aliments · 16h30')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Dîner, rien pour l’instant' })).toBeOnTheScreen();
    expect(screen.getByText('Touche pour ajouter')).toBeOnTheScreen();
  });

  it('opens the add sheet on the meal touched', async () => {
    await renderToday(mockup);

    await fireEvent.press(screen.getByRole('button', { name: 'Dîner, rien pour l’instant' }));

    expect(screen).toHavePathname('/add');
    expect(screen).toHaveSearchParams({ meal: 'dinner' });
  });

  it('shows the water of the day and adds a glass with the +', async () => {
    await renderToday(mockup);

    expect(screen.getByText('1,5 / 3\u00a0L')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un verre de 250 ml' }));

    expect(addWater).toHaveBeenCalledWith(
      expect.anything(),
      signedIn.data?.user.id,
      250,
      expect.any(Date),
    );
  });

  it('opens the water sheet from the card', async () => {
    await renderToday(mockup);
    await fireEvent.press(screen.getByRole('button', { name: 'Eau : 1,5\u00a0L sur 3\u00a0L' }));

    expect(screen).toHavePathname('/water');
  });

  it('opens the entries of a filled meal', async () => {
    await renderToday(mockup);

    await fireEvent.press(screen.getByRole('button', { name: /^Déjeuner, 3 aliments/ }));

    expect(screen).toHavePathname('/meal/lunch');
  });

  it('says how much the target is exceeded', async () => {
    await renderToday({ ...mockup, eaten: { ...mockup.eaten, kcal: 3020 } });

    expect(screen.getByText('Au-dessus de ta cible')).toBeOnTheScreen();
    expect(screen.getByText('+120\u00a0kcal')).toBeOnTheScreen();
  });

  it('opens the journal from the "Semaine" chip', async () => {
    await renderToday(mockup);

    await fireEvent.press(screen.getByRole('button', { name: 'Semaine' }));

    expect(screen).toHavePathname('/journal');
  });

  it('explains that the target has not reached the phone yet', async () => {
    await renderToday({ ...mockup, target: null });

    expect(
      screen.getByText(/Ta cible s’affichera dès que Cran aura pu joindre le serveur/),
    ).toBeOnTheScreen();
  });
});
