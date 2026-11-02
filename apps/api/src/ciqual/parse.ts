// Reading the CIQUAL table (ANSES), XML version: `alim_*.xml` lists the foods, `compo_*.xml` their
// content per constituent. Pure functions, apart from the streamed reading of the files.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

import type { foods } from '../db/schema';

/** Constituents kept, by CIQUAL code. */
export const CONSTITUENTS = {
  /** Energy per Regulation (EU) 1169/2011, the value printed on food labels. */
  kcal: '328',
  /** Proteins, N × Jones factor. */
  protein: '25000',
  carbs: '31000',
  fat: '40000',
  fiber: '34100',
  /** Salt (sodium chloride). */
  salt: '10004',
} as const;

export type Constituent = keyof typeof CONSTITUENTS;

const constituentByCode = new Map<string, Constituent>(
  Object.entries(CONSTITUENTS).map(([name, code]) => [code, name as Constituent]),
);

/** A content as written in the table: a number, "traces", "< 0,5" (below the limit) or "-". */
export type CiqualValue =
  | { kind: 'value'; value: number }
  | { kind: 'traces' }
  | { kind: 'below'; limit: number }
  | { kind: 'missing' };

function frenchNumber(text: string): number | null {
  if (!/^\d+(,\d+)?$/.test(text)) return null;
  return Number(text.replace(',', '.'));
}

export function parseCiqualValue(raw: string | null): CiqualValue {
  const text = raw?.trim() ?? '';
  if (text.toLowerCase() === 'traces') return { kind: 'traces' };
  const below = /^<\s*(.+)$/.exec(text);
  if (below?.[1] !== undefined) {
    const limit = frenchNumber(below[1].trim());
    return limit === null ? { kind: 'missing' } : { kind: 'below', limit };
  }
  const value = frenchNumber(text);
  return value === null ? { kind: 'missing' } : { kind: 'value', value };
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name] ?? '');
}

/** One element per line: `<tag> value </tag>`, or `<tag missing=" " />` for an empty value. */
const ELEMENT = /^<(\w+)(?:\s[^>]*?)?(?:\/>|>(.*)<\/\1>)$/;

/**
 * Records of a CIQUAL XML file (`<ALIM>`, `<COMPO>`…), read line by line: the compo file is about
 * 70 MB and must not be loaded in memory. Empty values are null.
 */
export async function* readRecords(
  lines: AsyncIterable<string> | Iterable<string>,
  recordTag: string,
): AsyncGenerator<Record<string, string | null>> {
  let record: Record<string, string | null> | null = null;
  for await (const rawLine of lines) {
    // trim() also drops the byte order mark at the start of the file.
    const line = rawLine.trim();
    if (line === `<${recordTag}>`) {
      record = {};
    } else if (line === `</${recordTag}>`) {
      if (record) yield record;
      record = null;
    } else if (record) {
      const element = ELEMENT.exec(line);
      if (element?.[1] !== undefined) {
        const value = element[2] === undefined ? null : decodeEntities(element[2]).trim();
        record[element[1]] = value === '' ? null : value;
      }
    }
  }
}

/**
 * Lines of a file, opened only when iterated: a readline interface starts reading at once, and
 * lines emitted before the loop begins would be lost.
 */
export async function* fileLines(path: string): AsyncGenerator<string> {
  yield* createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
}

export type Contents = Partial<Record<Constituent, CiqualValue>>;

/** Contents of the kept constituents, by food code. */
export async function readContents(
  lines: AsyncIterable<string> | Iterable<string>,
): Promise<Map<string, Contents>> {
  const contents = new Map<string, Contents>();
  for await (const record of readRecords(lines, 'COMPO')) {
    const food = record.alim_code;
    const constituent = constituentByCode.get(record.const_code ?? '');
    if (!food || !constituent) continue;
    const values = contents.get(food) ?? {};
    values[constituent] = parseCiqualValue(record.teneur ?? null);
    contents.set(food, values);
  }
  return contents;
}

export type CiqualFood = Pick<
  typeof foods.$inferInsert,
  | 'sourceRef'
  | 'name'
  | 'kcal100g'
  | 'protein100g'
  | 'carbs100g'
  | 'fat100g'
  | 'fiber100g'
  | 'salt100g'
  | 'qualityFlag'
>;

/** Known amount: traces and values below the detection limit count as 0. */
function amount(value: CiqualValue | undefined): number | null {
  if (!value || value.kind === 'missing') return null;
  return value.kind === 'value' ? value.value : 0;
}

/**
 * A CIQUAL food as a row of `foods`, or null without energy (Johan's decision, S2-1). Missing or
 * "traces" calories and macros are stored as 0 and the food is marked incomplete; a value below the
 * detection limit ("< 0,5") is a measurement, stored as 0 without the flag. Fibre and salt stay
 * optional.
 */
export function toFood(code: string, name: string, contents: Contents): CiqualFood | null {
  const kcal = contents.kcal;
  if (kcal?.kind !== 'value') return null;

  const macros = [contents.protein, contents.carbs, contents.fat];
  const incomplete = macros.some(
    (value) => !value || value.kind === 'missing' || value.kind === 'traces',
  );
  return {
    sourceRef: code,
    name,
    kcal100g: kcal.value,
    protein100g: amount(contents.protein) ?? 0,
    carbs100g: amount(contents.carbs) ?? 0,
    fat100g: amount(contents.fat) ?? 0,
    fiber100g: amount(contents.fiber),
    salt100g: amount(contents.salt),
    qualityFlag: incomplete ? 'incomplete' : 'ok',
  };
}
