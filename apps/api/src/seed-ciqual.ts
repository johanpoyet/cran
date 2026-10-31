// Imports the CIQUAL table into `foods`: `pnpm --filter @cran/api seed:ciqual [directory]`.
// Without a directory, downloads the version below from Zenodo (ANSES deposit, CC BY 4.0).
import { createWriteStream } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';

import { importCiqual } from './ciqual/import';
import { fileLines } from './ciqual/parse';
import { createDatabase } from './db/client';
import { loadEnv } from './env';
import { createLogger } from './logger';

/** CIQUAL 2025 (19 November 2025), https://zenodo.org/records/17550133. */
const ZENODO_FILES = 'https://zenodo.org/api/records/17550133/files';
const VERSION = '2025_11_03';

async function download(directory: string): Promise<void> {
  for (const file of [`alim_${VERSION}.xml`, `compo_${VERSION}.xml`]) {
    const res = await fetch(`${ZENODO_FILES}/${file}/content`);
    if (!res.ok || !res.body) throw new Error(`Download of ${file} failed: ${String(res.status)}`);
    await pipeline(
      Readable.fromWeb(res.body as ReadableStream<Uint8Array>),
      createWriteStream(join(directory, file)),
    );
  }
}

/** `alim_*.xml` and `compo_*.xml` of a directory (not `alim_grp_*.xml`). */
async function findFiles(directory: string): Promise<{ foods: string; contents: string }> {
  const names = await readdir(directory);
  const foods = names.find((name) => /^alim_\d.*\.xml$/.test(name));
  const contents = names.find((name) => /^compo_\d.*\.xml$/.test(name));
  if (!foods || !contents) throw new Error(`No alim_*.xml and compo_*.xml in ${directory}`);
  return { foods: join(directory, foods), contents: join(directory, contents) };
}

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const given = process.argv[2];
const directory = given ?? (await mkdtemp(join(tmpdir(), 'ciqual-')));
const database = createDatabase(env.DATABASE_URL, { max: 1 });

try {
  if (!given) await download(directory);
  const files = await findFiles(directory);
  const result = await importCiqual(database.db, {
    foods: fileLines(files.foods),
    contents: fileLines(files.contents),
  });
  logger.info(
    {
      imported: result.imported,
      written: result.written,
      removed: result.removed,
      skipped: result.skipped.length,
    },
    'CIQUAL imported',
  );
} catch (error) {
  logger.fatal({ err: error }, 'CIQUAL import failed');
  process.exitCode = 1;
} finally {
  await database.close();
  if (!given) await rm(directory, { recursive: true, force: true });
}
