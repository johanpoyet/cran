import { describe, expect, it } from 'vitest';

import { alimLines, compoLines, rice } from './fixtures';
import { parseCiqualValue, readContents, readRecords, toFood } from './parse';

describe('parseCiqualValue', () => {
  it.each([
    ['131', { kind: 'value', value: 131 }],
    [' 28,6 ', { kind: 'value', value: 28.6 }],
    ['traces', { kind: 'traces' }],
    ['< 0,5', { kind: 'below', limit: 0.5 }],
    ['<0,013', { kind: 'below', limit: 0.013 }],
    ['-', { kind: 'missing' }],
    ['< n.d.', { kind: 'missing' }],
    [null, { kind: 'missing' }],
  ])('reads %j', (raw, expected) => {
    expect(parseCiqualValue(raw)).toEqual(expected);
  });
});

describe('readRecords', () => {
  it('reads the records line by line, with entities and empty values', async () => {
    const lines = alimLines([{ code: '25601', name: 'Pâtes &amp; sauce', contents: {} }]);
    const records = [];
    for await (const record of readRecords(lines, 'ALIM')) records.push(record);

    expect(records).toEqual([
      {
        alim_code: '25601',
        alim_nom_fr: 'Pâtes & sauce',
        alim_nom_eng: '-',
        alim_nom_sci: null,
        alim_grp_code: '04',
      },
    ]);
  });

  it('keeps only the constituents used by Cran', async () => {
    const contents = await readContents(compoLines([rice]));

    expect(contents.get('9104')).toEqual({
      kcal: { kind: 'value', value: 131 },
      protein: { kind: 'value', value: 2.8 },
      carbs: { kind: 'value', value: 28.6 },
      fat: { kind: 'value', value: 0.5 },
      fiber: { kind: 'value', value: 0.6 },
      salt: { kind: 'below', limit: 0.013 },
    });
  });
});

describe('toFood', () => {
  it('maps a complete food, a value below the detection limit counting as 0', async () => {
    const contents = await readContents(compoLines([rice]));

    expect(toFood(rice.code, rice.name, contents.get(rice.code) ?? {})).toEqual({
      sourceRef: '9104',
      name: 'Riz blanc, cuit, sans sel ajouté',
      kcal100g: 131,
      protein100g: 2.8,
      carbs100g: 28.6,
      fat100g: 0.5,
      fiber100g: 0.6,
      salt100g: 0,
      qualityFlag: 'ok',
    });
  });

  it.each([
    ['traces of carbohydrates', { kind: 'traces' } as const],
    ['missing carbohydrates', { kind: 'missing' } as const],
    ['no carbohydrate row', undefined],
  ])('stores %s as 0 and marks the food incomplete', (_, carbs) => {
    const food = toFood('1', 'Test', {
      kcal: { kind: 'value', value: 50 },
      protein: { kind: 'value', value: 10 },
      fat: { kind: 'below', limit: 0.5 },
      ...(carbs ? { carbs } : {}),
    });

    expect(food).toMatchObject({ carbs100g: 0, fat100g: 0, qualityFlag: 'incomplete' });
  });

  it('keeps missing fibre and salt empty, without marking the food incomplete', () => {
    const food = toFood('1', 'Test', {
      kcal: { kind: 'value', value: 50 },
      protein: { kind: 'value', value: 10 },
      carbs: { kind: 'value', value: 1 },
      fat: { kind: 'value', value: 1 },
      salt: { kind: 'missing' },
    });

    expect(food).toMatchObject({ fiber100g: null, salt100g: null, qualityFlag: 'ok' });
  });

  it.each([
    ['missing', { kind: 'missing' } as const],
    ['traces', { kind: 'traces' } as const],
    ['absent', undefined],
  ])('leaves out a food whose energy is %s', (_, kcal) => {
    expect(toFood('1', 'Test', kcal ? { kcal } : {})).toBeNull();
  });
});
