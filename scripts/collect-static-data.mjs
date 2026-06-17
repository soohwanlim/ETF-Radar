import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  PERIOD_DAYS,
  calculateRate,
  compactSeries,
  compareHoldings,
  decodeHtmlText,
  formatChange,
  isSupportedDomesticSpotEtf,
  normalizeIssueCode,
  parseNaverHoldings,
  parseNumber,
} from './static-data-lib.mjs';
import { buildThemeSignals } from './theme-signals.mjs';

const KRX_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';
const NAVER_LIST_URL = 'https://finance.naver.com/api/sise/etfItemList.nhn';
const DATA_DIR = new URL('../public/data/', import.meta.url);
const REQUEST_DELAY_MS = Number(process.env.COLLECT_DELAY_MS || 350);
const RETENTION_DAYS = 365;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(date) {
  return formatDate(date).replaceAll('-', '');
}

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(new URL(name, DATA_DIR), 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  const target = new URL(name, DATA_DIR);
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value)}\n`);
}

async function writeCollectionCheck({ manifest, status, checkedAt, latestAvailableAsOf }) {
  await Promise.all([
    writeJson('manifest.json', {
      ...manifest,
      lastCheckedAt: checkedAt,
      latestAvailableAsOf,
      lastCheckState: 'no_new_data',
    }),
    writeJson('status.json', {
      ...status,
      generatedAt: status.generatedAt || manifest.generatedAt || checkedAt,
      asOf: status.asOf || manifest.asOf || latestAvailableAsOf,
      state: status.state || manifest.status || 'success',
      etfCount: status.etfCount ?? manifest.etfCount ?? 0,
      failedCount: status.failedCount ?? manifest.failedCount ?? 0,
      changeCount: status.changeCount ?? manifest.changeCount ?? 0,
      themeSignalCount: status.themeSignalCount ?? manifest.themeSignalCount ?? 0,
      source: status.source || manifest.source || 'KRX Open API / Naver Finance TOP 10',
      lastCheckedAt: checkedAt,
      latestAvailableAsOf,
      lastCheckState: 'no_new_data',
    }),
  ]);
}

async function fetchText(url, encoding = 'utf-8') {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ETF-Radar/1.0; daily EOD collector)',
      Referer: 'https://finance.naver.com/',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return new TextDecoder(encoding).decode(await response.arrayBuffer());
}

async function fetchUniverse() {
  const data = JSON.parse(await fetchText(NAVER_LIST_URL, 'euc-kr'));
  return (data?.result?.etfItemList || []).filter(isSupportedDomesticSpotEtf);
}

async function fetchKrxClose(apiKey) {
  if (!apiKey) throw new Error('KRX_API_KEY is required');
  for (let offset = 0; offset < 10; offset++) {
    const date = new Date(Date.now() + 9 * 60 * 60 * 1000 - offset * 86400000);
    const basDd = compactDate(date);
    const response = await fetch(`${KRX_URL}?basDd=${basDd}`, { headers: { AUTH_KEY: apiKey } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || data.respCode === '401') throw new Error('KRX API unauthorized');
    if (!response.ok) throw new Error(`KRX API HTTP ${response.status}`);
    const rows = data.OutBlock_1 || [];
    if (rows.length) return { asOf: formatDate(date), rows };
  }
  throw new Error('KRX API returned no recent data');
}

function normalizeKrx(row) {
  return {
    code: normalizeIssueCode(row.ISU_CD || row.ISU_SRT_CD || row.SHRT_CODE),
    name: row.ISU_NM || '',
    price: parseNumber(row.TDD_CLSPRC),
    change: parseNumber(row.CMPPREVDD_PRC),
    changeRate: parseNumber(row.FLUC_RT),
    nav: parseNumber(row.NAV) || null,
    marketCap: Math.round(parseNumber(row.MKTCAP) / 100000000),
    netAssets: Math.round(parseNumber(row.INVSTASST_NETASST_TOTAMT) / 100000000) || null,
    listedShares: parseNumber(row.LIST_SHRS) || null,
    volume: parseNumber(row.ACC_TRDVOL),
    benchmark: row.IDX_IND_NM || null,
  };
}

function buildListingCalendar(etfs, asOf) {
  const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
  const recent = etfs
    .filter(etf => {
      if (!etf.listingDate) return false;
      const age = (asOfTime - Date.parse(`${etf.listingDate}T00:00:00Z`)) / 86400000;
      return age >= 0 && age <= 90;
    })
    .sort((a, b) => b.listingDate.localeCompare(a.listingDate) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 12)
    .map(etf => ({
      code: etf.code,
      name: etf.name,
      listingDate: etf.listingDate,
      provider: etf.provider || null,
      price: etf.price,
      asOf: etf.asOf,
    }));

  return {
    generatedAt: new Date().toISOString(),
    asOf,
    source: 'Naver Finance listingDate / KRX Open API',
    recent,
    upcoming: [],
    upcomingSourceStatus: 'unavailable_structured_source',
  };
}

function extractTableValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<th[^>]*scope="row"[^>]*>\\s*${escaped}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`));
  return match ? decodeHtmlText(match[1]) : null;
}

function normalizeKoreanDate(value) {
  const match = value?.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : null;
}

function parseDetail(html) {
  const feeMatch = html.match(/summary="펀드보수 정보"[\s\S]*?<td>\s*연\s*<em>([\d.]+)%<\/em>/);
  const providerMatch = html.match(/<th[^>]*>자산운용사<\/th>\s*<td>\s*<span[^>]*>([\s\S]*?)<\/span>/);
  const descriptionMatch = html.match(/<div id="summary_info"[^>]*>[\s\S]*?<h4>ETF개요<\/h4>\s*<p>([\s\S]*?)<\/p>/);
  return {
    listingDate: normalizeKoreanDate(extractTableValue(html, '상장일')),
    fee: feeMatch ? Number(feeMatch[1]) : null,
    provider: providerMatch ? decodeHtmlText(providerMatch[1]) : null,
    fundType: extractTableValue(html, '유형'),
    description: descriptionMatch ? decodeHtmlText(descriptionMatch[1]) : null,
  };
}

async function fetchHistory(code) {
  const end = new Date();
  const start = new Date(end.getTime() - 10 * 365 * 86400000 - 45 * 86400000);
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&startTime=${compactDate(start)}&endTime=${compactDate(end)}&timeframe=day`;
  const text = await fetchText(url, 'euc-kr');
  return [...text.matchAll(/\["(20\d{6})",\s*\d+,\s*\d+,\s*\d+,\s*(\d+),/g)]
    .map(match => [`${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`, Number(match[2])])
    .filter(point => point[1] > 0);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const [manifest, existingStatus, existingEtfs, existingHoldings, existingHistory, existingSeries] = await Promise.all([
    readJson('manifest.json', {}),
    readJson('status.json', {}),
    readJson('etfs.json', []),
    readJson('holdings.json', {}),
    readJson('changes/history.json', []),
    readJson('price-series.json', {}),
  ]);
  const existingEtfMap = new Map(existingEtfs.map(item => [item.code, item]));
  const universe = await fetchUniverse();
  const universeMap = new Map(universe.map(item => [item.itemcode, item]));
  const market = await fetchKrxClose(process.env.KRX_API_KEY);
  const checkedAt = new Date().toISOString();
  if (!process.env.FORCE_COLLECT && manifest.asOf === market.asOf && existingEtfs.length > 0) {
    await writeCollectionCheck({
      manifest,
      status: existingStatus,
      checkedAt,
      latestAvailableAsOf: market.asOf,
    });
    console.log(`최신 정적 데이터가 이미 존재합니다: ${market.asOf}`);
    return;
  }
  const marketRows = market.rows.map(normalizeKrx).filter(item => universeMap.has(item.code) && item.price > 0);
  console.log(`Market snapshot ${market.asOf}: KRX rows ${market.rows.length}, Naver universe ${universe.length}, matched ETFs ${marketRows.length}`);
  if (marketRows.length === 0) {
    const krxSamples = market.rows.slice(0, 5).map(row => row.ISU_CD || row.ISU_SRT_CD || row.SHRT_CODE || '(empty)');
    const naverSamples = universe.slice(0, 5).map(item => item.itemcode || '(empty)');
    throw new Error(`No ETF codes matched between KRX and Naver. KRX samples: ${krxSamples.join(', ')} / Naver samples: ${naverSamples.join(', ')}`);
  }
  const marketMap = new Map(marketRows.map(item => [item.code, item]));
  const holdings = {};
  const series = { ...existingSeries };
  const changes = [];
  const etfs = [];
  const failures = [];

  for (const [index, universeItem] of universe.entries()) {
    const code = universeItem.itemcode;
    const current = marketMap.get(code);
    if (!current) continue;
    try {
      const html = await fetchText(`https://finance.naver.com/item/main.naver?code=${code}`, 'utf-8');
      const detail = parseDetail(html);
      holdings[code] = parseNaverHoldings(html, market.asOf);
      const previousHoldings = existingHoldings[code] || [];
      const previous = existingEtfMap.get(code) || {};
      if (previousHoldings.length > 0) {
        for (const change of compareHoldings(previousHoldings, holdings[code])) {
          const listedShareChangeRate = previous.listedShares > 0 && current.listedShares > 0
            ? Number((((current.listedShares - previous.listedShares) / previous.listedShares) * 100).toFixed(2))
            : null;
          changes.push({
            ...change,
            code,
            etfName: current.name,
            date: market.asOf,
            message: formatChange(change),
            badge: change.type === 'new'
              ? 'TOP 10 진입'
              : change.type === 'out'
                ? 'TOP 10 이탈'
                : change.classification === 'price_effect'
                  ? '비중변동'
                  : change.classification === 'quantity_decrease_weight_held' ? '수량감소·비중유지' : '1CU 수량변화',
            source: 'Naver Finance',
            coverage: 'top10',
            previousListedShares: previous.listedShares ?? null,
            listedShares: current.listedShares,
            listedShareChangeRate,
          });
        }
      }

      let priceSeries = series[code] || [];
      if (priceSeries.length === 0) priceSeries = await fetchHistory(code);
      priceSeries = priceSeries.filter(point => point[0] < market.asOf);
      priceSeries.push([market.asOf, current.price]);
      series[code] = compactSeries(priceSeries.sort((a, b) => a[0].localeCompare(b[0])), market.asOf);

      etfs.push({
        ...previous,
        ...current,
        ...detail,
        code,
        name: current.name,
        aum: current.netAssets ?? current.marketCap,
        assetValueType: current.netAssets == null ? 'marketCap' : 'netAssets',
        rate1d: current.changeRate,
        ...Object.fromEntries(Object.entries(PERIOD_DAYS).map(([period, days]) => [`rate${period}`, calculateRate(series[code], market.asOf, days)])),
        source: 'KRX Open API / Naver Finance',
        asOf: market.asOf,
      });
      console.log(`[${index + 1}/${universe.length}] ${code} ${current.name}`);
    } catch (error) {
      console.warn(`[skip] ${code} ${current.name}: ${error.message}`);
      failures.push({ code, name: current.name, reason: error.message });
      if (existingEtfMap.has(code)) etfs.push(existingEtfMap.get(code));
      if (existingHoldings[code]) holdings[code] = existingHoldings[code];
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const cutoff = new Date(`${market.asOf}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const retainedHistory = existingHistory.filter(item => item.date !== market.asOf && item.date >= formatDate(cutoff));
  const history = [...changes, ...retainedHistory].slice(0, 10000);
  const themeSignals = buildThemeSignals(etfs, changes);
  etfs.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const listingCalendar = buildListingCalendar(etfs, market.asOf);

  const minimumSafeCount = existingEtfs.length > 0
    ? Math.floor(existingEtfs.length * 0.9)
    : Math.floor(marketRows.length * 0.9);
  if (etfs.length < minimumSafeCount) {
    throw new Error(`Collection safety check failed: ${etfs.length}/${minimumSafeCount} ETFs`);
  }

  const generatedAt = new Date().toISOString();
  const collectionState = failures.length === 0 ? 'success' : 'partial';
  const status = {
    generatedAt,
    asOf: market.asOf,
    state: collectionState,
    lastCheckedAt: generatedAt,
    latestAvailableAsOf: market.asOf,
    lastCheckState: collectionState === 'success' ? 'updated' : 'partial',
    etfCount: etfs.length,
    marketRowCount: marketRows.length,
    holdingsCount: Object.keys(holdings).length,
    changeCount: changes.length,
    themeSignalCount: themeSignals.length,
    recentListingCount: listingCalendar.recent.length,
    upcomingListingCount: listingCalendar.upcoming.length,
    failedCount: failures.length,
    failures,
    source: 'KRX Open API / Naver Finance TOP 10',
  };

  await Promise.all([
    writeJson('manifest.json', {
      generatedAt,
      asOf: market.asOf,
      lastCheckedAt: generatedAt,
      latestAvailableAsOf: market.asOf,
      lastCheckState: collectionState === 'success' ? 'updated' : 'partial',
      etfCount: etfs.length,
      status: collectionState,
      failedCount: failures.length,
      changeCount: changes.length,
      themeSignalCount: themeSignals.length,
      recentListingCount: listingCalendar.recent.length,
      upcomingListingCount: listingCalendar.upcoming.length,
      source: 'KRX Open API / Naver Finance TOP 10',
    }),
    writeJson('status.json', status),
    writeJson('etfs.json', etfs),
    writeJson('holdings.json', holdings),
    writeJson('price-series.json', series),
    writeJson('changes/latest.json', changes),
    writeJson('changes/history.json', history),
    writeJson('theme-signals.json', themeSignals),
    writeJson('listings.json', listingCalendar),
  ]);
  console.log(`완료: ${market.asOf}, ETF ${etfs.length}개, 변경 ${changes.length}건`);
}

await main();
