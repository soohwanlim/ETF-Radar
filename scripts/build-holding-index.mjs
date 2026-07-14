import { readFile, writeFile } from 'node:fs/promises';
import { buildHoldingIndex } from './holding-index.mjs';

const DATA_DIR = new URL('../public/data/', import.meta.url);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, DATA_DIR), 'utf8'));
}

const [etfs, holdings] = await Promise.all([
  readJson('etfs.json'),
  readJson('holdings.json'),
]);

const index = buildHoldingIndex(etfs, holdings, {
  asOf: etfs.find(etf => etf.asOf)?.asOf || null,
});

await writeFile(new URL('holding-index.json', DATA_DIR), `${JSON.stringify(index)}\n`);

console.log(`Holding index: ${index.count} holdings, ${index.asOf || 'unknown'} 기준`);
