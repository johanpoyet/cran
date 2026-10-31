import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/instrument.ts', 'src/migrate.ts', 'src/seed-ciqual.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  fixedExtension: false,
  sourcemap: true,
  dts: false,
  // Workspace packages ship TypeScript source: bundle them; npm deps stay in node_modules.
  deps: { alwaysBundle: [/^@cran\//] },
});
