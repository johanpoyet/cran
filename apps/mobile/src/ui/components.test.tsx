import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './chip';
import { MacroRing } from './macro-ring';
import { PrimaryButton } from './primary-button';
import { clampProgress } from './progress';
import { ProgressBar } from './progress-bar';
import { Text } from './text';

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
