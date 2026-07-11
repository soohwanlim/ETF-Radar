import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

import { normalizeIssueCode, parseNumber } from './static-data-lib.mjs';

const KRX_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';
const DATA_DIR = new URL('../public/data/', import.meta.url);
const ETF_URL = new URL('etfs.json', DATA_DIR);
const STATUS_URL = new URL('status.json', DATA_DIR);
const OHLC_DIR = new URL('ohlc/', DATA_DIR);
const MANIFEST_URL = new URL('manifest.json', OHLC_DIR);

const FIELD_CANDIDATES = {
  open: ['TDD_OPNPRC', 'OPNPRC', 'MKP'],
  high: ['TDD_HGPRC', 'HGPRC', 'HIPRC'],
  low: ['TDD_LWPRC', 'LWPRC', 'LOPRC'],
  close: ['TDD_CLSPRC', 'CLSPRC', 'CLSPRC_NM'],
};

function toCompactDate(date) {
  return date.replaceAll('-', '');
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
  return [open, high, low, close];
}

function normalizeKrxRowCode(row) {
  return normalizeIssueCode(row.ISU_CD || row.ISU_SRT_CD || row.SRT_ISU_CD || row.SRT_CD || row.SHORT_CODE);
}

async function readJson(url, fallback = null) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (error) {
    if (fallback !== null && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function fileSizeKb(url) {
  const info = await stat(url);
  return Number((info.size / 1024).toFixed(1));
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

  if (!response.ok) throw new Error(`KRX API HTTP ${response.status}`);
  const payload = await response.json();
  return payload.OutBlock_1 || [];
}

function sortRows(rows) {
  return rows.sort((a, b) => a[0].localeCompare(b[0]));
}

function mergeRow(rows, nextRow) {
  const withoutSameDate = rows.filter(row => row[0] !== nextRow[0]);
  withoutSameDate.push(nextRow);
  return sortRows(withoutSameDate);
}

function buildManifestItem(etf, payload, fileKb) {
  return {
    code: etf.code,
    name: etf.name,
    from: payload.from,
    to: payload.to,
    rowCount: payload.rowCount,
    missingCount: payload.missingCount || 0,
    file: `${etf.code}.json`,
    fileKb,
  };
}

async function main() {
  const apiKey = process.env.KRX_API_KEY;
  if (!apiKey) throw new Error('KRX_API_KEY is required.');

  const status = await readJson(STATUS_URL);
  const targetDate = status.latestAvailableAsOf || status.asOf;
  if (!targetDate) throw new Error('No target date found in status.json.');

  const etfs = (await readJson(ETF_URL))
    .map(etf => ({
      code: normalizeIssueCode(etf.code),
      name: etf.name,
      listingDate: etf.listingDate || null,
    }))
    .filter(etf => etf.code);
  const etfByCode = new Map(etfs.map(etf => [etf.code, etf]));

  await mkdir(OHLC_DIR, { recursive: true });
  const manifest = await readJson(MANIFEST_URL, {
    version: 1,
    source: 'KRX Open API etf_bydd_trd',
    requestedFrom: targetDate,
    requestedTo: targetDate,
    fields: ['date', 'open', 'high', 'low', 'close'],
    items: [],
  });

  const alreadyComplete =
    manifest.items.length >= etfs.length &&
    manifest.items.every(item => item.to >= targetDate || (etfByCode.get(item.code)?.listingDate || '') > targetDate);
  if (alreadyComplete) {
    console.log(`OHLC already includes ${targetDate}`);
    return;
  }

  const krxRowsByCode = new Map();
  for (const row of await fetchKrxRows(apiKey, targetDate)) {
    const code = normalizeKrxRowCode(row);
    if (etfByCode.has(code)) krxRowsByCode.set(code, row);
  }

  let updated = 0;
  let skipped = 0;
  const nextItems = [];

  for (const etf of etfs) {
    if (etf.listingDate && etf.listingDate > targetDate) {
      skipped += 1;
      continue;
    }

    const row = krxRowsByCode.get(etf.code);
    const candle = row ? rowToCandle(row) : null;
    const fileUrl = new URL(`${etf.code}.json`, OHLC_DIR);
    const existingPayload = await readJson(fileUrl, null);

    if (!candle) {
      if (existingPayload?.rows?.length) {
        nextItems.push(buildManifestItem(etf, existingPayload, await fileSizeKb(fileUrl)));
      }
      skipped += 1;
      continue;
    }

    const rows = mergeRow(existingPayload?.rows || [], [targetDate, ...candle]);
    const missingSample = (existingPayload?.missingSample || []).filter(item => !item.startsWith(`${targetDate}:`));
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
      missingCount: Math.max(0, existingPayload?.missingCount || 0),
      missingSample,
      rows,
    };
    await writeFile(fileUrl, `${JSON.stringify(payload)}\n`, 'utf8');
    nextItems.push(buildManifestItem(etf, payload, await fileSizeKb(fileUrl)));
    updated += 1;
  }

  const nextManifest = {
    version: 1,
    source: 'KRX Open API etf_bydd_trd',
    generatedAt: new Date().toISOString(),
    requestedFrom: manifest.requestedFrom || targetDate,
    requestedTo: targetDate,
    etfCount: nextItems.length,
    fields: ['date', 'open', 'high', 'low', 'close'],
    items: nextItems.sort((a, b) => a.code.localeCompare(b.code)),
  };
  await writeFile(MANIFEST_URL, `${JSON.stringify(nextManifest)}\n`, 'utf8');

  console.log(`OHLC append complete for ${targetDate}. Updated: ${updated}, skipped: ${skipped}`);
}

await main();