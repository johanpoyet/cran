import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';

import { IngredientRow } from './ingredient-row';
import { InlineNumberField } from './inline-number-field';
import { ListRow } from './list-row';
import { PrimaryButton } from './primary-button';
import { RecipeCard } from './recipe-card';
import { ServingsStepper } from './servings-stepper';

describe('RecipeCard', () => {
  it('opens the recipe', async () => {
    const onPress = jest.fn();
    await render(
      <RecipeCard
        name="Poulet riz curry"
        details="Meal prep · 4 parts"
        macros="P 55 · G 78 · L 9"
        kcal="614"
        kcalUnit="kcal / part"
        color="protein"
        background="proteinSoft"
        onPress={onPress}
        accessibilityLabel="Poulet riz curry, 614 kcal par part"
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Poulet riz curry, 614 kcal par part' }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ServingsStepper', () => {
  function Servings({ min = 1, max = 50 }: { min?: number; max?: number }) {
    const [value, setValue] = useState(4);
    return (
      <ServingsStepper
        value={value}
        min={min}
        max={max}
        onChange={setValue}
        format={(count) => `${String(count)} parts`}
        label="Nombre de parts"
        decrementLabel="Une part de moins"
        incrementLabel="Une part de plus"
      />
    );
  }

  it('changes the number of servings within its bounds', async () => {
    await render(<Servings max={5} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Une part de plus' }));
    expect(screen.getByText('5 parts')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Une part de plus' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Une part de moins' }));
    expect(screen.getByText('4 parts')).toBeOnTheScreen();
  });

  it('is adjustable with VoiceOver', async () => {
    await render(<Servings />);
    const stepper = screen.getByRole('adjustable', { name: 'Nombre de parts' });

    await fireEvent(stepper, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });

    expect(screen.getByRole('adjustable', { name: 'Nombre de parts' })).toHaveAccessibilityValue({
      text: '3 parts',
    });
  });
});

describe('IngredientRow', () => {
  it('shows the raw tag and opens the ingredient when it can', async () => {
    const onPress = jest.fn();
    await render(
      <IngredientRow
        name="Riz basmati"
        details="1 120 kcal · G 250 g"
        quantity="320 g"
        rawLabel="CRU"
        onPress={onPress}
        accessibilityLabel="Riz basmati, 320 g pesé cru"
      />,
    );

    expect(screen.getByText('CRU')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Riz basmati, 320 g pesé cru' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a plain row otherwise', async () => {
    await render(
      <IngredientRow
        name="Brocolis"
        details="136 kcal"
        quantity="400 g"
        accessibilityLabel="Brocolis, 400 g"
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('CRU')).toBeNull();
  });
});

describe('InlineNumberField', () => {
  it('reports the end of the edition', async () => {
    const onEndEditing = jest.fn();
    await render(
      <InlineNumberField
        value="2100"
        onChangeText={jest.fn()}
        onEndEditing={onEndEditing}
        unit="g"
        accessibilityLabel="Poids total une fois cuit, en grammes"
      />,
    );

    await fireEvent(screen.getByLabelText('Poids total une fois cuit, en grammes'), 'endEditing');
    expect(onEndEditing).toHaveBeenCalled();
  });
});

describe('ListRow', () => {
  it('becomes a button when it opens a screen', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Mes recettes" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mes recettes' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PrimaryButton with an icon', () => {
  it('keeps the label as its spoken name', async () => {
    await render(<PrimaryButton label="Nouvelle recette" icon={Plus} onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Nouvelle recette' })).toBeOnTheScreen();
  });
});
