import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import TabsLayout from './app/(tabs)/_layout';
import TodayScreen from './app/(tabs)/index';
import JournalScreen from './app/(tabs)/journal';
import ProfileScreen from './app/(tabs)/profile';
import WeightScreen from './app/(tabs)/weight';
import AddSheet from './app/add';

function renderApp() {
  return renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': TodayScreen,
      '(tabs)/journal': JournalScreen,
      '(tabs)/weight': WeightScreen,
      '(tabs)/profile': ProfileScreen,
      add: AddSheet,
    },
    { initialUrl: '/' },
  );
}

describe('app navigation', () => {
  it('opens on the Today tab', async () => {
    await renderApp();
    expect(screen.getByRole('header', { name: 'Ta journée' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Jour' })).toBeSelected();
  });

  it.each([
    ['Journal', 'Journal', '/journal'],
    ['Poids', 'Poids', '/weight'],
    ['Profil', 'Objectifs', '/profile'],
  ])('goes to the %s tab', async (tab, title, path) => {
    await renderApp();
    await fireEvent.press(screen.getByRole('tab', { name: tab }));
    expect(screen).toHavePathname(path);
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: tab })).toBeSelected();
  });

  it('opens and closes the add sheet from the + button', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un aliment' }));
    expect(screen).toHavePathname('/add');
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen).toHavePathname('/');
  });
});
