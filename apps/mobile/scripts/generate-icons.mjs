// Generates the app icons from the logo in docs/design/logo (run: pnpm --filter @cran/mobile icons).
// - icon.png          iOS / store icon, the 1024 px PNG exported with the mockups
// - adaptive-icon.png Android adaptive icon foreground: white mark on transparent, inside the safe zone
// - splash-icon.png   white mark on transparent, shown on the blue splash background
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const logoDir = join(here, '../../../docs/design/logo');
const assetsDir = join(here, '../assets');

const iconSvg = readFileSync(join(logoDir, 'app-icon.svg'), 'utf8');
// The mark drawn on a 100 × 100 grid; its "bite" is painted with the background blue.
const mark = /<g[^>]*>([\s\S]*)<\/g>/.exec(iconSvg)?.[1];
if (!mark) throw new Error('Mark group not found in app-icon.svg');

function render(svg, width, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(assetsDir, file), png);
  console.log(`wrote assets/${file}`);
}

// Mark bounds on its grid: x 16–98, y 10–88, so centre (57, 49). Android keeps the inner
// 66 % of the 108 dp canvas visible: scale so the mark fits within ~600 px of 1024.
const scale = 6.2;
const tx = 512 - 57 * scale;
const ty = 512 - 49 * scale;
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g transform="translate(${tx} ${ty}) scale(${scale})">${mark}</g></svg>`,
  1024,
  'adaptive-icon.png',
);

render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="11 3 94 94">${mark}</svg>`,
  600,
  'splash-icon.png',
);

copyFileSync(join(logoDir, 'app-icon-1024.png'), join(assetsDir, 'icon.png'));
console.log('wrote assets/icon.png');
