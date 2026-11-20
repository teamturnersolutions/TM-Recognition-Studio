import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');
const swPath = join(distDir, 'sw.js');

const assetEntries = readdirSync(assetsDir)
  .filter((file) => !file.endsWith('.map'))
  .sort()
  .map((file) => `  '/assets/${file}',`)
  .join('\n');

const swSource = readFileSync(swPath, 'utf8');
if (!swSource.includes('/* __PRECACHE_ASSETS__ */')) {
  throw new Error('Expected /* __PRECACHE_ASSETS__ */ placeholder in dist/sw.js');
}

const updated = swSource.replace('  /* __PRECACHE_ASSETS__ */', assetEntries);
writeFileSync(swPath, updated, 'utf8');
console.log(`Injected ${assetEntries ? assetEntries.split('\n').length : 0} precache asset(s) into dist/sw.js`);
