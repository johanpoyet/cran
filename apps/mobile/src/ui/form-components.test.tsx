import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ruler } from '../theme/tokens';
import { Checkbox } from './checkbox';
import { DayPicker } from './day-picker';
import { OptionCard } from './option-card';
import { RulerPicker, tickIndexAt } from './ruler-picker';
import { StepHeader } from './step-header';
import { Stepper } from './stepper';
import { SwitchRow } from './switch-row';
import { Text } from './text';

describe('StepHeader', () => {
  it('reports the step and goes back', async () => {
    const onBack = jest.fn();
    await render(
      <StepHeader
        backLabel="Retour"
        onBack={onBack}
        progress={{ step: 2, total: 5, label: 'Étape 2 sur 5' }}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Étape 2 sur 5' })).toHaveAccessibilityValue({
      min: 1,
      max: 5,
      now: 2,
    });
    expect(screen.getByText('2/5')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('OptionCard', () => {
  it('is a radio button reading its title, badge and subtitle', async () => {
    const onPress = jest.fn();
    await render(
      <OptionCard
        title="+1 kg / mois"
        badge="Recommandé"
        subtitle="Le bon équilibre"
        selected
        onPress={onPress}
      />,
    );
    const option = screen.getByRole('radio', {
      name: '+1 kg / mois, Recommandé, Le bon équilibre',
    });
    expect(option).toBeChecked();
    expect(screen.getByText('RECOMMANDÉ')).toBeOnTheScreen();
    await fireEvent.press(option);
    expect(onPress).toHaveBeenCalled();
  });
});

function Year() {
  const [year, setYear] = useState(2012);
  return (
    <Stepper
      value={year}
      min={1926}
      max={2012}
      onChange={setYear}
      label="Année de naissance"
      decrementLabel="Année précédente"
      incrementLabel="Année suivante"
      caption={`${String(2026 - year)} ans`}
    />
  );
}

describe('Stepper', () => {
  it('stays within its bounds', async () => {
    await render(<Year />);
    expect(screen.getByRole('button', { name: 'Année suivante' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Année précédente' }));
    expect(screen.getByText('2011')).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Année de naissance' })).toHaveAccessibilityValue(
      {
        text: '2011, 15 ans',
      },
    );
  });

  it('answers the screen reader increment and decrement', async () => {
    await render(<Year />);
    const stepper = screen.getByRole('adjustable', { name: 'Année de naissance' });
    await fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByText('2012')).toBeOnTheScreen();
  });
});

describe('tickIndexAt', () => {
  it.each([
    [0, 0],
    [ruler.tickSpacing * 3.4, 3],
    [ruler.tickSpacing * 3.6, 4],
    [-50, 0],
    [ruler.tickSpacing * 500, 110],
  ])('offset %p → tick %p', (offset, index) => {
    expect(tickIndexAt(offset, 111)).toBe(index);
  });
});

describe('RulerPicker', () => {
  function Weight({ onChange }: { onChange: (kg: number) => void }) {
    const [kg, setKg] = useState(70);
    return (
      <RulerPicker
        label="Poids actuel"
        value={kg}
        min={30}
        max={250}
        step={0.1}
        format={(value) => value.toFixed(1).replace('.', ',')}
        unit="kg"
        onChange={(value) => {
          setKg(value);
          onChange(value);
        }}
      />
    );
  }

  it('reads the value under the cursor while scrolling', async () => {
    const onChange = jest.fn();
    await render(<Weight onChange={onChange} />);
    // The list renders once the track knows its width.
    const picker = screen.getByRole('adjustable', { name: 'Poids actuel' });
    await fireEvent(picker.children[1] as never, 'layout', {
      nativeEvent: { layout: { width: 320, height: 56, x: 0, y: 0 } },
    });
    await fireEvent.scroll(screen.getByTestId('ruler-scroll'), {
      nativeEvent: { contentOffset: { x: ruler.tickSpacing * 384, y: 0 } },
    });
    expect(onChange).toHaveBeenLastCalledWith(68.4);
    expect(picker).toHaveAccessibilityValue({ text: '68,4 kg' });
  });

  it('steps by one tick with the screen reader', async () => {
    const onChange = jest.fn();
    await render(<Weight onChange={onChange} />);
    const picker = screen.getByRole('adjustable', { name: 'Poids actuel' });
    await fireEvent(picker, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(70.1);
  });
});

describe('DayPicker', () => {
  it('toggles the bit of each day, Monday first', async () => {
    const onChange = jest.fn();
    await render(
      <DayPicker
        mask={0b0000001}
        onChange={onChange}
        letters={['L', 'M', 'M', 'J', 'V', 'S', 'D']}
        names={['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Lundi' })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Dimanche' }));
    expect(onChange).toHaveBeenCalledWith(0b1000001);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lundi' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});

describe('Checkbox', () => {
  it('toggles and exposes its state', async () => {
    const onChange = jest.fn();
    await render(
      <Checkbox checked={false} onChange={onChange} label="J'accepte">
        <Text>J'accepte</Text>
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', { name: "J'accepte" });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('SwitchRow', () => {
  it('switches its value', async () => {
    const onValueChange = jest.fn();
    await render(
      <SwitchRow
        title="Bonus jour de séance"
        subtitle="+150 kcal"
        value
        onValueChange={onValueChange}
      />,
    );
    await fireEvent(screen.getByLabelText('Bonus jour de séance'), 'valueChange', false);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
