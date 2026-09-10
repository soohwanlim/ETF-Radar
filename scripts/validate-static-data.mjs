import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DATA_DIR = new URL('../public/data/', import.meta.url);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[0-9A-Z]{6}$/;

function isDate(value) {
  if (!DATE_PATTERN.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function addProblem(problems, condition, message) {
  if (!condition) problems.push(message);
}

export function validateSnapshot({ etfs, holdings, manifest, status, ohlcManifest, ohlcByCode = new Map() }) {
  const problems = [];
  const codes = new Set();

  addProblem(problems, Array.isArray(etfs) && etfs.length > 0, 'etfs.json must contain at least one ETF');
  for (const [index, etf] of (etfs || []).entries()) {
    const label = `etfs.json[${index}]`;
    addProblem(problems, CODE_PATTERN.test(etf.code || ''), `${label} has invalid code: ${etf.code || 'missing'}`);
    addProblem(problems, !codes.has(etf.code), `${label} has duplicate code: ${etf.code || 'missing'}`);
    codes.add(etf.code);
    addProblem(problems, typeof etf.name === 'string' && etf.name.trim().length > 0, `${label} has no name`);
    addProblem(problems, isDate(etf.asOf), `${label} has invalid asOf: ${etf.asOf || 'missing'}`);
    addProblem(problems, Number.isFinite(etf.price) && etf.price > 0, `${label} has invalid price: ${etf.price}`);
    addProblem(problems, etf.aum == null || (Number.isFinite(etf.aum) && etf.aum >= 0), `${label} has invalid aum: ${etf.aum}`);
  }

  addProblem(problems, isDate(manifest?.asOf), `manifest has invalid asOf: ${manifest?.asOf || 'missing'}`);
  addProblem(problems, manifest?.etfCount === etfs?.length, `manifest etfCount ${manifest?.etfCount} does not match etfs.json ${etfs?.length}`);
  addProblem(problems, status?.asOf === manifest?.asOf, `status asOf ${status?.asOf} does not match manifest ${manifest?.asOf}`);
  addProblem(problems, status?.etfCount === etfs?.length, `status etfCount ${status?.etfCount} does not match etfs.json ${etfs?.length}`);
  addProblem(problems, status?.failedCount === (status?.failures?.length || 0), `status failedCount ${status?.failedCount} does not match failures ${status?.failures?.length || 0}`);

  const holdingCodes = Object.keys(holdings || {});
  addProblem(problems, holdingCodes.length === status?.holdingsCount, `status holdingsCount ${status?.holdingsCount} does not match holdings.json ${holdingCodes.length}`);
  for (const code of holdingCodes) {
    addProblem(problems, codes.has(code), `holdings.json contains unknown ETF code: ${code}`);
    const items = holdings[code];
    addProblem(problems, Array.isArray(items), `holdings.json ${code} must be an array`);
    const itemCodes = new Set();
    for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
      const label = `holdings.json ${code}[${index}]`;
      addProblem(problems, CODE_PATTERN.test(item.code || ''), `${label} has invalid holding code: ${item.code || 'missing'}`);
      addProblem(problems, !itemCodes.has(item.code), `${label} has duplicate holding code: ${item.code || 'missing'}`);
      itemCodes.add(item.code);
      addProblem(problems, isDate(item.asOf), `${label} has invalid asOf: ${item.asOf || 'missing'}`);
      addProblem(problems, item.asOf <= manifest?.asOf, `${label} asOf ${item.asOf} is after manifest ${manifest?.asOf}`);
      addProblem(problems, Number.isFinite(item.shares) && item.shares >= 0, `${label} has invalid shares: ${item.shares}`);
      addProblem(problems, Number.isFinite(item.weight) && item.weight >= 0 && item.weight <= 100, `${label} has invalid weight: ${item.weight}`);
    }
  }

  const manifestItems = ohlcManifest?.items || [];
  addProblem(problems, ohlcManifest?.etfCount === manifestItems.length, `OHLC manifest etfCount ${ohlcManifest?.etfCount} does not match items ${manifestItems.length}`);
  const ohlcCodes = new Set();
  for (const item of manifestItems) {
    addProblem(problems, codes.has(item.code), `OHLC manifest contains unknown ETF code: ${item.code}`);
    addProblem(problems, !ohlcCodes.has(item.code), `OHLC manifest has duplicate ETF code: ${item.code}`);
    ohlcCodes.add(item.code);
    const payload = ohlcByCode.get(item.code);
    if (!payload) continue;
    addProblem(problems, payload.code === item.code, `OHLC ${item.code} payload code is ${payload.code}`);
    addProblem(problems, payload.rowCount === payload.rows?.length, `OHLC ${item.code} rowCount ${payload.rowCount} does not match rows ${payload.rows?.length}`);
    addProblem(problems, item.rowCount === payload.rows?.length, `OHLC manifest ${item.code} rowCount ${item.rowCount} does not match payload ${payload.rows?.length}`);

    let previousDate = '';
    for (const [index, row] of (payload.rows || []).entries()) {
      const [date, open, high, low, close] = row;
      const label = `OHLC ${item.code}[${index}]`;
      addProblem(problems, isDate(date), `${label} has invalid date: ${date}`);
      addProblem(problems, date > previousDate, `${label} is not strictly date-sorted: ${date}`);
      previousDate = date;
      addProblem(problems, [open, high, low, close].every(value => Number.isFinite(value) && value > 0), `${label} contains a non-positive price`);
      addProblem(problems, high >= Math.max(open, low, close), `${label} high is below another price`);
      addProblem(problems, low <= Math.min(open, high, close), `${label} low is above another price`);
    }
    if (payload.rows?.length) {
      addProblem(problems, payload.from === payload.rows[0][0], `OHLC ${item.code} from does not match its first row`);
      addProblem(problems, payload.to === payload.rows.at(-1)[0], `OHLC ${item.code} to does not match its last row`);
      addProblem(problems, item.from === payload.from && item.to === payload.to, `OHLC manifest dates do not match ${item.code} payload`);
    }
  }

  return problems;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, DATA_DIR), 'utf8'));
}

async function main() {
  const [etfs, holdings, manifest, status, ohlcManifest] = await Promise.all([
    readJson('etfs.json'),
    readJson('holdings.json'),
    readJson('manifest.json'),
    readJson('status.json'),
    readJson('ohlc/manifest.json'),
  ]);
  const ohlcByCode = new Map(await Promise.all(ohlcManifest.items.map(async item => [
    item.code,
    await readJson(`ohlc/${item.file || `${item.code}.json`}`),
  ])));
  const problems = validateSnapshot({ etfs, holdings, manifest, status, ohlcManifest, ohlcByCode });
  if (problems.length) throw new Error(`Static data validation failed (${problems.length}):\n- ${problems.join('\n- ')}`);
  console.log(`Static data validation passed: ${etfs.length} ETFs, ${ohlcManifest.items.length} OHLC files`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
