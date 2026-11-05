import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '../theme/tokens';
import { TemplateCard } from './template-card';

describe('TemplateCard', () => {
  it('applies on press, opens its menu on long press, with VoiceOver actions', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const onDelete = jest.fn();
    await render(
      <TemplateCard
        name="Dîner prise de masse"
        details="4 aliments · 780 kcal"
        background="proteinSoft"
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel="Modèle Dîner prise de masse, 4 aliments · 780 kcal"
        accessibilityHint="Ajoute tout le modèle au repas choisi"
        actions={[
          { name: 'rename', label: 'Renommer', onAction: jest.fn() },
          { name: 'delete', label: 'Supprimer', onAction: onDelete },
        ]}
      />,
    );
    const card = screen.getByRole('button', { name: /^Modèle Dîner prise de masse/ });

    expect(card).toHaveStyle({ backgroundColor: colors.proteinSoft });
    expect(screen.getByText('4 aliments · 780 kcal')).toBeOnTheScreen();
    await fireEvent.press(card);
    await fireEvent(card, 'longPress');
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
