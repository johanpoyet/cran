import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar, tabBarBottomOffset, type TabRoute } from './tab-bar';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderBar(active: TabRoute = 'index') {
  const onNavigate = jest.fn();
  const onAdd = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TabBar active={active} onNavigate={onNavigate} onAdd={onAdd} />
    </SafeAreaProvider>,
  );
  return { onNavigate, onAdd };
}

describe('TabBar', () => {
  it('shows four tabs and the add button, in mockup order, with French labels', async () => {
    await renderBar();
    const labels = screen
      .getAllByRole(/tab|button/)
      .map((el) => el.props.accessibilityLabel as string);
    expect(labels).toEqual(['Jour', 'Journal', 'Ajouter un aliment', 'Poids', 'Profil']);
  });

  it('marks only the active tab as selected', async () => {
    await renderBar('weight');
    expect(screen.getByRole('tab', { name: 'Poids' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Jour' })).not.toBeSelected();
  });

  it('navigates to another tab', async () => {
    const { onNavigate } = await renderBar('index');
    await fireEvent.press(screen.getByRole('tab', { name: 'Journal' }));
    expect(onNavigate).toHaveBeenCalledWith('journal');
  });

  it('does not navigate when pressing the active tab', async () => {
    const { onNavigate } = await renderBar('profile');
    await fireEvent.press(screen.getByRole('tab', { name: 'Profil' }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('opens the add sheet from the central button', async () => {
    const { onAdd } = await renderBar();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter un aliment' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('gives every target at least 44 × 44 pt', async () => {
    await renderBar();
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveStyle({ minWidth: 44, minHeight: 44 });
    }
    expect(screen.getByRole('button', { name: 'Ajouter un aliment' })).toHaveStyle({
      width: 52,
      height: 52,
    });
  });
});

describe('tabBarBottomOffset', () => {
  it('overlaps the home indicator area like the mockup (24 pt on a 34 pt inset)', () => {
    expect(tabBarBottomOffset(34)).toBe(24);
  });

  it('keeps a minimum margin on devices without inset', () => {
    expect(tabBarBottomOffset(0)).toBe(16);
  });
});
