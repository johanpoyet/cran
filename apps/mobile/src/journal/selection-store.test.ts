import { basmati, complet } from '../test/foods';
import { useAddSelection } from './selection-store';

beforeEach(() => {
  useAddSelection.getState().clear();
});

describe('useAddSelection', () => {
  it('selects, replaces and unselects foods', () => {
    const { select, unselect } = useAddSelection.getState();

    select({ food: basmati, grams: 250, portionLabel: null });
    select({ food: basmati, grams: 150, portionLabel: '1 bol' });
    select({ food: complet, grams: 100, portionLabel: null });

    expect([...useAddSelection.getState().selected.values()]).toEqual([
      { food: basmati, grams: 150, portionLabel: '1 bol' },
      { food: complet, grams: 100, portionLabel: null },
    ]);

    unselect(basmati.id);
    expect([...useAddSelection.getState().selected.keys()]).toEqual([complet.id]);
  });

  it('remembers the foods shown, without changing the state for the same foods', () => {
    const { show } = useAddSelection.getState();
    show([basmati]);
    const shown = useAddSelection.getState().shown;

    show([basmati]);

    expect(useAddSelection.getState().shown).toBe(shown);
    expect(shown.get(basmati.id)).toBe(basmati);
  });

  it('forgets everything when the sheet closes', () => {
    useAddSelection.getState().show([basmati]);
    useAddSelection.getState().select({ food: basmati, grams: 250, portionLabel: null });

    useAddSelection.getState().clear();

    expect(useAddSelection.getState().selected.size).toBe(0);
    expect(useAddSelection.getState().shown.size).toBe(0);
  });
});
