import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus } from 'lucide-react-native';

import { Chip } from './chip';
import { IconTile } from './icon-tile';
import { LinkButton } from './link-button';
import { ListRow } from './list-row';
import { MacroRing } from './macro-ring';
import { PrimaryButton } from './primary-button';
import { clampProgress } from './progress';
import { ProgressBar } from './progress-bar';
import { Text } from './text';
import { TextField } from './text-field';

describe('clampProgress', () => {
  it.each([
    [0.5, 0.5],
    [-1, 0],
    [1.4, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampProgress(input)).toBe(expected);
  });
});

describe('ProgressBar', () => {
  it('exposes its value to assistive technologies and fills proportionally', async () => {
    await render(<ProgressBar value={0.74} accessibilityLabel="Calories" />);
    const bar = screen.getByRole('progressbar', { name: 'Calories' });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 74 });
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '74%' });
  });

  it('never overflows', async () => {
    await render(<ProgressBar value={2} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '100%' });
  });
});

describe('MacroRing', () => {
  it('reports progress and draws the arc', async () => {
    await render(<MacroRing value={0.5} color="protein" accessibilityLabel="Protéines" />);
    expect(screen.getByLabelText('Protéines')).toHaveAccessibilityValue({ now: 50 });
    expect(screen.getByTestId('macro-ring-progress')).toBeTruthy();
  });

  it('draws only the track at zero', async () => {
    await render(<MacroRing value={0} color="carbs" />);
    expect(screen.queryByTestId('macro-ring-progress')).toBeNull();
  });
});

describe('PrimaryButton', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Continuer" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled for assistive technologies and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Continuer" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continuer' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('PrimaryButton loading', () => {
  it('is busy and ignores presses while an action runs', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Se connecter" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Se connecter' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('LinkButton', () => {
  it('is a button that can be disabled', async () => {
    const onPress = jest.fn();
    await render(<LinkButton label="Continuer avec un email" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continuer avec un email' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('is labelled, shows its hint and reports changes', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextField label="Mot de passe" hint="8 caractères minimum" onChangeText={onChangeText} />,
    );
    const input = screen.getByLabelText('Mot de passe');
    expect(input).toHaveProp('accessibilityHint', '8 caractères minimum');
    expect(screen.getByText('8 caractères minimum')).toBeOnTheScreen();
    await fireEvent.changeText(input, 'secret123');
    expect(onChangeText).toHaveBeenCalledWith('secret123');
  });
});

describe('ListRow', () => {
  it('shows its title next to a decorative icon tile', async () => {
    await render(
      <ListRow
        title="Scan des codes-barres"
        leading={<IconTile icon={Plus} color="accent" background="accentSoft" />}
      />,
    );
    expect(screen.getByText('Scan des codes-barres')).toBeOnTheScreen();
    expect(screen.queryByRole('image')).toBeNull();
  });
});

describe('Chip', () => {
  it('reflects its selected state', async () => {
    await render(<Chip label="Dîner" selected />);
    expect(screen.getByRole('button', { name: 'Dîner' })).toBeSelected();
  });
});

describe('Text', () => {
  it('uses the font family of the variant weight', async () => {
    await render(<Text variant="title">Ta journée</Text>);
    expect(screen.getByText('Ta journée')).toHaveStyle({
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 28,
    });
  });
});
