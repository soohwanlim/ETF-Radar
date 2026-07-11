import { mkdir, stat, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { normalizeIssueCode, parseNumber } from './static-data-lib.mjs';

const KRX_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';
const OUTPUT_DIR = new URL('../public/data/ohlc-sample/', import.meta.url);

const code = normalizeIssueCode(process.argv[2] || '069500');
const startDate = process.argv[3] || '2026-07-01';
const endDate = process.argv[4] || new Date().toISOString().slice(0, 10);
const delayMs = Number(process.env.OHLC_DELAY_MS || 150);
const apiKey = process.env.KRX_API_KEY;

const FIELD_CANDIDATES = {
  open: ['TDD_OPNPRC', 'OPNPRC', 'MKP'],
  high: ['TDD_HGPRC', 'HGPRC', 'HIPRC'],
  low: ['TDD_LWPRC', 'LWPRC', 'LOPRC'],
  close: ['TDD_CLSPRC', 'CLSPRC', 'CLSPRC_NM'],
};

function toCompactDate(date) {
  return date.replaceAll('-', '');
}

function toDashDate(compactDate) {
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
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

  if (!open || !high || !low || !close) {
    return null;
  }

  return { open, high, low, close };
}

async function fetchKrxRows(date) {
  const url = new URL(KRX_URL);
  url.searchParams.set('basDd', toCompactDate(date));
  const response = await fetch(url, {
    headers: {
      AUTH_KEY: apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return { date, rows: [], error: `HTTP ${response.status}` };
  }

  const payload = await response.json();
  return { date, rows: payload.OutBlock_1 || [], error: null };
}

async function fileSizeKb(url) {
  const info = await stat(url);
  return (info.size / 1024).toFixed(1);
}

async function main() {
  if (!apiKey) {
    throw new Error('KRX_API_KEY is required. Example: $env:KRX_API_KEY="..."');
  }
  if (!/^[0-9A-Z]{6}$/.test(code)) {
    throw new Error(`Invalid ETF code: ${code}`);
  }

  const rows = [];
  const missingDates = [];

  for (const date of eachWeekday(startDate, endDate)) {
    const result = await fetchKrxRows(date);
    if (result.error) {
      missingDates.push(`${date}:${result.error}`);
      await delay(delayMs);
      continue;
    }

    const row = result.rows.find(item => normalizeIssueCode(
      item.ISU_CD || item.ISU_SRT_CD || item.SRT_ISU_CD || item.SRT_CD || item.SHORT_CODE,
    ) === code);
    if (!row) {
      missingDates.push(`${date}:missing`);
      await delay(delayMs);
      continue;
    }

    const candle = rowToCandle(row);
    if (!candle) {
      missingDates.push(date + ':invalid_ohlc');
      await delay(delayMs);
      continue;
    }

    rows.push([date, candle.open, candle.high, candle.low, candle.close]);
    await delay(delayMs);
  }

  if (!rows.length) {
    throw new Error(`No OHLC rows collected for ${code}. Missing: ${missingDates.slice(0, 10).join(', ')}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputUrl = new URL(`${code}.json`, OUTPUT_DIR);
  const payload = {
    version: 1,
    source: 'KRX Open API etf_bydd_trd',
    generatedAt: new Date().toISOString(),
    code,
    from: rows[0][0],
    to: rows.at(-1)[0],
    fields: ['date', 'open', 'high', 'low', 'close'],
    rowCount: rows.length,
    missingCount: missingDates.length,
    missingSample: missingDates.slice(0, 20),
    rows,
  };

  await writeFile(outputUrl, `${JSON.stringify(payload)}\n`, 'utf8');

  console.log(`Wrote ${toDashDate(toCompactDate(payload.from))}..${toDashDate(toCompactDate(payload.to))} OHLC sample for ${code}`);
  console.log(`Rows: ${payload.rowCount}, missing: ${payload.missingCount}, size: ${await fileSizeKb(outputUrl)} KB`);
  console.log(`Output: ${outputUrl.pathname}`);
}

await main();
