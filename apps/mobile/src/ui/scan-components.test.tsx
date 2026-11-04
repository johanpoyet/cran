import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionSheetIOS, Platform } from 'react-native';

import { LetterTile } from './letter-tile';
import { MenuButton } from './menu-button';
import { ValueTile } from './value-tile';

const MEALS = [
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'snack', label: 'Collation' },
  { value: 'dinner', label: 'Dîner' },
] as const;

describe('MenuButton', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOs;
    jest.restoreAllMocks();
  });

  it('reads the current option and picks another from the iOS menu', async () => {
    Platform.OS = 'ios';
    const onChange = jest.fn();
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_, callback) => {
      callback(2);
    });
    await render(
      <MenuButton
        value="snack"
        options={MEALS}
        onChange={onChange}
        accessibilityLabel="Ajouter à"
        cancelLabel="Annuler"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter à : Collation' }));

    expect(onChange).toHaveBeenCalledWith('dinner');
  });

  it('ignores "Annuler"', async () => {
    Platform.OS = 'ios';
    const onChange = jest.fn();
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_, callback) => {
      callback(MEALS.length);
    });
    await render(
      <MenuButton
        value="snack"
        options={MEALS}
        onChange={onChange}
        accessibilityLabel="Ajouter à"
        cancelLabel="Annuler"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter à : Collation' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves to the next option on Android', async () => {
    Platform.OS = 'android';
    const onChange = jest.fn();
    await render(
      <MenuButton
        value="dinner"
        options={MEALS}
        onChange={onChange}
        accessibilityLabel="Ajouter à"
        cancelLabel="Annuler"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter à : Dîner' }));

    expect(onChange).toHaveBeenCalledWith('lunch');
  });
});

describe('ValueTile', () => {
  it('is read with its spoken label', async () => {
    await render(
      <ValueTile value="16,5" label="prot. g" accessibilityLabel="Protéines : 16,5 g" />,
    );

    expect(screen.getByLabelText('Protéines : 16,5 g')).toBeOnTheScreen();
  });
});

describe('LetterTile', () => {
  it('shows the letter, hidden from assistive technologies', async () => {
    await render(<LetterTile letter="S" />);

    expect(screen.queryByText('S')).toBeNull();
    expect(screen.getByText('S', { includeHiddenElements: true })).toBeTruthy();
  });
});
