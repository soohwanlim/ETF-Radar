import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { normalizeIssueCode, parseNumber } from './static-data-lib.mjs';

const KRX_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';
const ETF_URL = new URL('../public/data/etfs.json', import.meta.url);
const OUTPUT_DIR = new URL('../public/data/ohlc/', import.meta.url);

const FIELD_CANDIDATES = {
  open: ['TDD_OPNPRC', 'OPNPRC', 'MKP'],
  high: ['TDD_HGPRC', 'HGPRC', 'HIPRC'],
  low: ['TDD_LWPRC', 'LWPRC', 'LOPRC'],
  close: ['TDD_CLSPRC', 'CLSPRC', 'CLSPRC_NM'],
};

function parseArgs(argv) {
  const positional = [];
  const options = {
    start: '2025-01-01',
    end: new Date().toISOString().slice(0, 10),
    delayMs: Number(process.env.OHLC_DELAY_MS || 150),
    limit: null,
    codes: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--delay=')) options.delayMs = Number(arg.slice('--delay='.length));
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--codes=')) {
      options.codes = arg
        .slice('--codes='.length)
        .split(',')
        .map(code => normalizeIssueCode(code))
        .filter(Boolean);
    } else positional.push(arg);
  }

  if (positional[0]) options.start = positional[0];
  if (positional[1]) options.end = positional[1];
  return options;
}

function toCompactDate(date) {
  return date.replaceAll('-', '');
}

function* eachWeekday(start, end) {
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (current <= last) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      yield current.toISOString().slice(0, 10);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

function pickNumber(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return parseNumber(row[key]);
    }
  }
  return 0;
}

function rowToCandle(row) {
  const open = pickNumber(row, FIELD_CANDIDATES.open);
  const high = pickNumber(row, FIELD_CANDIDATES.high);
  const low = pickNumber(row, FIELD_CANDIDATES.low);
  const close = pickNumber(row, FIELD_CANDIDATES.close);
  if (!open || !high || !low || !close) return null;
  return { open, high, low, close };
}

function normalizeKrxRowCode(row) {
  return normalizeIssueCode(row.ISU_CD || row.ISU_SRT_CD || row.SRT_ISU_CD || row.SRT_CD || row.SHORT_CODE);
}

async function readEtfs() {
  const etfs = JSON.parse(await readFile(ETF_URL, 'utf8'));
  return etfs
    .map(etf => ({
      code: normalizeIssueCode(etf.code),
      name: etf.name,
      listingDate: etf.listingDate || null,
    }))
    .filter(etf => etf.code);
}

async function fetchKrxRows(apiKey, date) {
  const url = new URL(KRX_URL);
  url.searchParams.set('basDd', toCompactDate(date));
  const response = await fetch(url, {
    headers: {
      AUTH_KEY: apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) return { rows: [], error: `HTTP ${response.status}` };
  const payload = await response.json();
  return { rows: payload.OutBlock_1 || [], error: null };
}

async function fileSizeKb(url) {
  const info = await stat(url);
  return Number((info.size / 1024).toFixed(1));
}

function shouldSkipDateForEtf(etf, date) {
  return etf.listingDate && etf.listingDate > date;
}

async function main() {
  const apiKey = process.env.KRX_API_KEY;
  if (!apiKey) throw new Error('KRX_API_KEY is required. Example: $env:KRX_API_KEY="..."');

  const options = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error(`Invalid --delay value: ${options.delayMs}`);
  }

  const allEtfs = await readEtfs();
  let targetEtfs = options.codes
    ? allEtfs.filter(etf => options.codes.includes(etf.code))
    : allEtfs;
  if (options.limit) targetEtfs = targetEtfs.slice(0, options.limit);
  if (!targetEtfs.length) throw new Error('No ETF targets selected.');

  const seriesByCode = new Map(targetEtfs.map(etf => [etf.code, []]));
  const missingByCode = new Map(targetEtfs.map(etf => [etf.code, []]));
  const targetByCode = new Map(targetEtfs.map(etf => [etf.code, etf]));
  const dates = [...eachWeekday(options.start, options.end)];

  console.log(`Backfilling OHLC for ${targetEtfs.length} ETFs from ${options.start} to ${options.end}`);
  console.log(`KRX date requests: ${dates.length}, delay: ${options.delayMs}ms`);

  for (const [index, date] of dates.entries()) {
    const result = await fetchKrxRows(apiKey, date);
    if (result.error) {
      for (const etf of targetEtfs) {
        if (!shouldSkipDateForEtf(etf, date)) missingByCode.get(etf.code).push(`${date}:${result.error}`);
      }
      await delay(options.delayMs);
      continue;
    }

    const krxRowsByCode = new Map();
    for (const row of result.rows) {
      const rowCode = normalizeKrxRowCode(row);
      if (targetByCode.has(rowCode)) krxRowsByCode.set(rowCode, row);
    }

    for (const etf of targetEtfs) {
      if (shouldSkipDateForEtf(etf, date)) continue;
      const row = krxRowsByCode.get(etf.code);
      if (!row) {
        missingByCode.get(etf.code).push(`${date}:missing`);
        continue;
      }
      const candle = rowToCandle(row);
      if (!candle) {
        missingByCode.get(etf.code).push(`${date}:invalid_ohlc`);
        continue;
      }
      seriesByCode.get(etf.code).push([date, candle.open, candle.high, candle.low, candle.close]);
    }

    if ((index + 1) % 25 === 0 || index === dates.length - 1) {
      console.log(`Fetched ${index + 1}/${dates.length} KRX dates (${date})`);
    }
    await delay(options.delayMs);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const manifestItems = [];
  for (const etf of targetEtfs) {
    const rows = seriesByCode.get(etf.code);
    const missing = missingByCode.get(etf.code);
    if (!rows.length) {
      console.warn(`Skip ${etf.code}: no OHLC rows`);
      continue;
    }

    const outputUrl = new URL(`${etf.code}.json`, OUTPUT_DIR);
    const payload = {
      version: 1,
      source: 'KRX Open API etf_bydd_trd',
      generatedAt: new Date().toISOString(),
      code: etf.code,
      name: etf.name,
      from: rows[0][0],
      to: rows.at(-1)[0],
      fields: ['date', 'open', 'high', 'low', 'close'],
      rowCount: rows.length,
      missingCount: missing.length,
      missingSample: missing.slice(0, 20),
      rows,
    };
    await writeFile(outputUrl, `${JSON.stringify(payload)}\n`, 'utf8');
    manifestItems.push({
      code: etf.code,
      name: etf.name,
      from: payload.from,
      to: payload.to,
      rowCount: payload.rowCount,
      missingCount: payload.missingCount,
      file: `${etf.code}.json`,
      fileKb: await fileSizeKb(outputUrl),
    });
  }

  const manifest = {
    version: 1,
    source: 'KRX Open API etf_bydd_trd',
    generatedAt: new Date().toISOString(),
    requestedFrom: options.start,
    requestedTo: options.end,
    etfCount: manifestItems.length,
    fields: ['date', 'open', 'high', 'low', 'close'],
    items: manifestItems,
  };
  await writeFile(new URL('manifest.json', OUTPUT_DIR), `${JSON.stringify(manifest)}\n`, 'utf8');

  const totalKb = manifestItems.reduce((sum, item) => sum + item.fileKb, 0);
  const totalRows = manifestItems.reduce((sum, item) => sum + item.rowCount, 0);
  const totalMissing = manifestItems.reduce((sum, item) => sum + item.missingCount, 0);
  console.log(`Done. ETFs: ${manifestItems.length}, rows: ${totalRows}, missing: ${totalMissing}, files: ${totalKb.toFixed(1)} KB`);
  console.log(`Output: ${OUTPUT_DIR.pathname}`);
}

await main();
