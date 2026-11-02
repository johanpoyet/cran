// Small CIQUAL files in the layout of the 2025 XML version (CRLF, BOM, one element per line).

export interface FixtureFood {
  code: string;
  name: string;
  /** Raw contents by constituent code; absent = no row in compo. */
  contents: Record<string, string | null>;
}

export function alimLines(foods: FixtureFood[]): string[] {
  return [
    '\uFEFF<?xml version="1.0" encoding="utf-8" ?>',
    '<TABLE>',
    ...foods.flatMap((food) => [
      '   <ALIM>',
      `      <alim_code> ${food.code} </alim_code>`,
      `      <alim_nom_fr> ${food.name} </alim_nom_fr>`,
      '      <alim_nom_eng> - </alim_nom_eng>',
      '      <alim_nom_sci missing=" " />',
      '      <alim_grp_code> 04 </alim_grp_code>',
      '   </ALIM>',
    ]),
    '</TABLE>',
  ].map((line) => `${line}\r`);
}

export function compoLines(foods: FixtureFood[]): string[] {
  return [
    '\uFEFF<?xml version="1.0" encoding="utf-8" ?>',
    '<TABLE>',
    ...foods.flatMap((food) =>
      Object.entries(food.contents).flatMap(([code, value]) => [
        '   <COMPO>',
        `      <alim_code> ${food.code} </alim_code>`,
        `      <const_code> ${code} </const_code>`,
        value === null ? '      <teneur missing=" " />' : `      <teneur> ${value} </teneur>`,
        '      <min missing=" " />',
        '      <code_confiance> A </code_confiance>',
        '   </COMPO>',
      ]),
    ),
    '</TABLE>',
  ].map((line) => `${line}\r`);
}

/** Rice as in CIQUAL 2025 (code 9104), contents by constituent code. */
export const rice: FixtureFood = {
  code: '9104',
  name: 'Riz blanc, cuit, sans sel ajouté',
  contents: {
    '328': '131',
    '25000': '2,8',
    '31000': '28,6',
    '40000': '0,5',
    '34100': '0,6',
    '10004': '&lt; 0,013',
    '400': '68',
  },
};
