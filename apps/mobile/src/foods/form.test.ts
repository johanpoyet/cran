import {
  canSave,
  emptyNewFoodForm,
  liveCoherence,
  type NewFoodForm,
  parsePortion,
  validateNewFood,
} from './form';

// Values of the "Nouvel aliment" mockup.
const galette: NewFoodForm = {
  ...emptyNewFoodForm('Galette de sarrasin'),
  kcal: '162',
  protein: '6',
  carbs: '30',
  fat: '2',
};

describe('canSave', () => {
  it('needs the name and the four values', () => {
    expect(canSave(emptyNewFoodForm())).toBe(false);
    expect(canSave({ ...galette, name: '  ' })).toBe(false);
    expect(canSave({ ...galette, fat: '' })).toBe(false);
    expect(canSave(galette)).toBe(true);
  });
});

describe('liveCoherence', () => {
  it('waits for the four values', () => {
    expect(liveCoherence({ ...galette, fat: '' })).toBeNull();
    expect(liveCoherence({ ...galette, fat: 'x' })).toBeNull();
  });

  it('is coherent for 162 kcal and warns for 300 kcal', () => {
    expect(liveCoherence(galette)).toEqual({ computedKcal: 162, coherent: true, kcal: 162 });
    expect(liveCoherence({ ...galette, kcal: '300' })).toEqual({
      computedKcal: 162,
      coherent: false,
      kcal: 300,
    });
  });

  it('reads French decimals', () => {
    expect(liveCoherence({ ...galette, protein: '6,5', carbs: '29,5' })?.computedKcal).toBe(162);
  });
});

describe('validateNewFood', () => {
  it('returns the food to save', () => {
    const portions = [{ label: '1 galette', grams: 50 }];
    expect(validateNewFood({ ...galette, brand: ' ', portions })).toEqual({
      ok: true,
      food: {
        name: 'Galette de sarrasin',
        brand: null,
        kcal100g: 162,
        protein100g: 6,
        carbs100g: 30,
        fat100g: 2,
        portions,
      },
    });
  });

  it.each([
    ['calories that are not a number', { kcal: 'abc' }, 'kcal', 'kcal'],
    ['too many calories', { kcal: '901' }, 'kcal', 'kcal'],
    ['a macro that is not a number', { carbs: '-3' }, 'macro', 'carbs'],
    ['a macro above 100 g', { fat: '101' }, 'macro', 'fat'],
    ['more than 100 g of macros', { protein: '40', carbs: '50', fat: '11' }, 'macrosTotal', null],
    ['an empty name', { name: ' ' }, 'name', 'name'],
  ])('reports %s', (_, change, error, field) => {
    expect(validateNewFood({ ...galette, ...change })).toEqual({ ok: false, error, field });
  });
});

describe('parsePortion', () => {
  it('reads a named portion', () => {
    expect(parsePortion(' 1 galette ', '50')).toEqual({ label: '1 galette', grams: 50 });
    expect(parsePortion('1 pot', '125,5')).toEqual({ label: '1 pot', grams: 125.5 });
  });

  it.each([
    ['', '50'],
    ['1 galette', ''],
    ['1 galette', '0'],
    ['1 galette', 'beaucoup'],
  ])('refuses %j = %j', (label, grams) => {
    expect(parsePortion(label, grams)).toBeNull();
  });
});
