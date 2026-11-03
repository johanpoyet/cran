import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import WaterSheet from './app/water';
import { readToday } from './journal/today';
import { addWater, deleteWater, readWater } from './journal/water';
import { refreshLocalCopy } from './profile/local-copy';
import { setWaterGoal } from './profile/settings';
import { setSession, signedIn } from './test/fake-auth-client';

jest.mock('./auth/client', () => jest.requireActual<object>('./test/fake-auth-client'));
jest.mock('./journal/water', () => ({
  readWater: jest.fn(),
  addWater: jest.fn(),
  deleteWater: jest.fn(),
}));
jest.mock('./journal/today', () => ({ readToday: jest.fn() }));
jest.mock('./profile/settings', () => ({ setWaterGoal: jest.fn() }));
jest.mock('./profile/local-copy', () => ({
  refreshLocalCopy: jest.fn(() => Promise.resolve(true)),
}));

const userId = signedIn.data?.user.id;
const glass = (id: string, hours: number, minutes: number) => ({
  id,
  userId: userId ?? '',
  date: '2026-11-03',
  ml: 250,
  createdAt: new Date(2026, 10, 3, hours, minutes),
  updatedAt: new Date(2026, 10, 3, hours, minutes),
  deletedAt: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readWater).mockReturnValue({
    totalMl: 500,
    logs: [glass('g1', 9, 10), glass('g2', 11, 0)],
  });
  jest.mocked(readToday).mockReturnValue({
    target: null,
    eaten: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    meals: [],
    water: { totalMl: 500, goalMl: 3000 },
  });
});

async function openSheet() {
  setSession(signedIn);
  await renderRouter({ index: () => null, water: WaterSheet }, { initialUrl: '/' });
  await act(() => {
    router.push('/water');
  });
  await screen.findByRole('header', { name: 'Eau' });
}

describe('water sheet', () => {
  it('shows the water of the day against the goal, and the glasses', async () => {
    await openSheet();

    expect(screen.getByText('0,5 / 3 L')).toBeOnTheScreen();
    expect(screen.getByText('250 ml · 9h10')).toBeOnTheScreen();
    expect(screen.getByText('250 ml · 11h00')).toBeOnTheScreen();
  });

  it('adds a glass of 250 ml', async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un verre de 250 ml' }));

    expect(addWater).toHaveBeenCalledWith(expect.anything(), userId, 250, expect.any(Date));
  });

  it('removes a glass touched', async () => {
    await openSheet();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Retirer le verre de 250 ml de 9h10' }),
    );

    expect(deleteWater).toHaveBeenCalledWith(expect.anything(), userId, 'g1');
  });

  it('changes the daily goal by 250 ml and sends it to the server', async () => {
    await openSheet();
    expect(screen.getByRole('adjustable', { name: 'Objectif par jour' })).toHaveAccessibilityValue({
      text: '3 L',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Augmenter l’objectif' }));

    expect(setWaterGoal).toHaveBeenCalledWith(expect.anything(), userId, 3250);
    expect(refreshLocalCopy).toHaveBeenCalled();
  });

  it('says when no water has been drunk yet', async () => {
    jest.mocked(readWater).mockReturnValue({ totalMl: 0, logs: [] });
    await openSheet();

    expect(screen.getByText('Pas encore d’eau aujourd’hui.')).toBeOnTheScreen();
  });
});
