// workers/index.js
// Cloudflare Worker entry point for ETF Radar APIs and the weekday close scheduler.

// ─── 상수 ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=utf-8'
};

const CHANGE_RETENTION_DAYS = 365;
const SCHEDULER_STATUS_KEY = 'scheduler:close-update';
const LATEST_CHANGES_KEY = 'changes:latest-date';
const PRICE_PERIOD_DAYS = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  '10y': 3650,
};
const KRX_ETF_DAILY_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd';

const DOMESTIC_EQUITY_TAB_CODES = new Set([1, 2]);
const EXCLUDED_ETF_NAME_PATTERNS = [
  /레버리지/,
  /인버스/,
  /커버드콜/,
  /채권혼합/,
  /선물/,
  /미국|나스닥|NASDAQ|S&P|다우존스|러셀/,
  /중국|차이나|일본|인도|베트남|유럽|유로존|글로벌|월드/,
  /채권|국고채|회사채|금융채|은행채|통안채|머니마켓|CD금리|KOFR/,
  /원유|금선물|은선물|구리|농산물|원자재|달러|엔화|위안/,
];

function isSupportedDomesticSpotEtf(item) {
  const tabCode = Number(item.etfTabCode);
  const name = item.itemname || '';
  return DOMESTIC_EQUITY_TAB_CODES.has(tabCode)
    && !EXCLUDED_ETF_NAME_PATTERNS.some(pattern => pattern.test(name));
}

function getProviderFromName(name) {
  const providers = [
    ['KODEX', '삼성자산운용'], ['TIGER', '미래에셋자산운용'], ['RISE', 'KB자산운용'],
    ['ACE', '한국투자신탁운용'], ['SOL', '신한자산운용'], ['PLUS', '한화자산운용'],
    ['HANARO', 'NH-Amundi자산운용'], ['KIWOOM', '키움투자자산운용'], ['KoAct', '삼성액티브자산운용'],
    ['TIME', '타임폴리오자산운용'], ['WON', '우리자산운용'], ['1Q', '하나자산운용'],
    ['BNK', 'BNK자산운용'], ['DAISHIN343', '대신자산운용'], ['IBK', 'IBK자산운용'],
  ];
  return providers.find(([brand]) => name.startsWith(brand))?.[1] || null;
}

async function fetchNaverEtfItems() {
  const response = await fetch('https://finance.naver.com/api/sise/etfItemList.nhn', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://finance.naver.com/fund/etf.naver',
    },
  });
  if (!response.ok) throw new Error('Naver Finance API 요청 실패');

  const text = new TextDecoder('euc-kr').decode(await response.arrayBuffer());
  const data = JSON.parse(text);
  return (data?.result?.etfItemList || []).filter(isSupportedDomesticSpotEtf);
}

function normalizeNaverEtf(item) {
  return {
    code: item.itemcode,
    name: item.itemname,
    price: Number(item.nowVal) || 0,
    change: Number(item.changeVal) * (item.risefall === '5' || item.risefall === '4' ? -1 : 1),
    changeRate: Number(item.changeRate) || 0,
    nav: Number(item.nav) || null,
    marketCap: Math.round(Number(item.marketSum) || 0),
    netAssets: null,
    volume: Number(item.quant) || 0,
    benchmark: null,
    rate3m: Number(item.threeMonthEarnRate) || null,
    source: 'Naver Finance',
  };
}

export function normalizeKrxEtf(row) {
  const name = row.ISU_NM || '';
  return {
    code: String(row.ISU_CD || '').trim(),
    name,
    price: parseNumber(row.TDD_CLSPRC),
    change: parseNumber(row.CMPPREVDD_PRC),
    changeRate: parseNumber(row.FLUC_RT),
    nav: parseNumber(row.NAV) || null,
    marketCap: Math.round(parseNumber(row.MKTCAP) / 100000000),
    netAssets: Math.round(parseNumber(row.INVSTASST_NETASST_TOTAMT) / 100000000),
    volume: parseNumber(row.ACC_TRDVOL),
    benchmark: row.IDX_IND_NM || null,
    rate3m: null,
    source: 'KRX Open API',
  };
}

function getKstDateDaysAgo(days) {
  return getDateDaysAgo(days).replaceAll('-', '');
}

export async function fetchKrxEtfItems(env) {
  if (!env.KRX_API_KEY) throw new Error('KRX_API_KEY_NOT_CONFIGURED');

  for (let offset = 0; offset < 10; offset++) {
    const basDd = getKstDateDaysAgo(offset);
    const response = await fetch(`${KRX_ETF_DAILY_URL}?basDd=${basDd}`, {
      headers: { AUTH_KEY: env.KRX_API_KEY },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || data.respCode === '401') throw new Error('KRX_API_UNAUTHORIZED');
    if (!response.ok) throw new Error(`KRX_API_HTTP_${response.status}`);

    const rows = data.OutBlock_1 || data.output || [];
    if (rows.length > 0) {
      return {
        items: rows
          .map(normalizeKrxEtf)
          .filter(item => item.code && item.price > 0)
          .filter(item => isSupportedDomesticSpotEtf({ etfTabCode: 1, itemname: item.name })),
        source: 'KRX Open API',
        asOf: `${basDd.slice(0, 4)}-${basDd.slice(4, 6)}-${basDd.slice(6, 8)}`,
      };
    }
  }
  throw new Error('KRX_API_NO_RECENT_DATA');
}

export async function fetchMarketEtfItems(env) {
  try {
    return await fetchKrxEtfItems(env);
  } catch (error) {
    console.warn(`KRX Open API 사용 불가, Naver로 대체: ${error.message}`);
    const items = (await fetchNaverEtfItems()).map(normalizeNaverEtf);
    return { items, source: 'Naver Finance', asOf: getToday(), fallbackReason: error.message };
  }
}

function getDateDaysAgo(days) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000 - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function findSnapshotDate(dates, targetDate) {
  return dates.filter(date => date <= targetDate).sort().at(-1) || null;
}

async function getPriceBaseline(period, env) {
  const days = PRICE_PERIOD_DAYS[period];
  if (!days || !env.KV) return null;

  const dates = await env.KV.get('prices:dates', 'json') || [];
  const snapshotDate = findSnapshotDate(dates, getDateDaysAgo(days));
  if (!snapshotDate) return null;

  const prices = await env.KV.get(`prices:${snapshotDate}`, 'json');
  return prices ? { date: snapshotDate, prices } : null;
}

async function storeDailyPriceSnapshot(items, env, asOf) {
  if (!env.KV) return;

  const snapshotDate = asOf || getToday();
  const prices = Object.fromEntries(items.map(item => [item.code, item.price]));
  const dates = await env.KV.get('prices:dates', 'json') || [];
  const updatedDates = [...new Set([...dates, snapshotDate])].sort().slice(-3700);
  const series = await env.KV.get('prices:series', 'json') || {};

  for (const item of items) {
    const points = series[item.code] || [];
    const withoutSnapshotDate = points.filter(point => point[0] !== snapshotDate);
    const updated = [...withoutSnapshotDate, [snapshotDate, item.price]].sort((a, b) => a[0].localeCompare(b[0]));
    const recentCutoff = getDateDaysAgo(400);
    const monthEnds = new Map();
    for (const point of updated) {
      if (point[0] < recentCutoff) monthEnds.set(point[0].slice(0, 7), point);
    }
    series[item.code] = [
      ...monthEnds.values(),
      ...updated.filter(point => point[0] >= recentCutoff),
    ].sort((a, b) => a[0].localeCompare(b[0]));
  }

  await env.KV.put(`prices:${snapshotDate}`, JSON.stringify(prices), {
    expirationTtl: 11 * 365 * 24 * 60 * 60,
  });
  await env.KV.put('prices:dates', JSON.stringify(updatedDates));
  await env.KV.put('prices:series', JSON.stringify(series));
}

async function storeChangesHistory(changes, env, asOf) {
  if (!env.KV || changes.length === 0) return;

  const existing = await env.KV.get('changes:history', 'json') || [];
  const cutoff = getDateDaysAgo(CHANGE_RETENTION_DAYS - 1);
  const retained = existing.filter(change => change.date !== asOf && change.date >= cutoff);
  await env.KV.put('changes:history', JSON.stringify([...changes, ...retained].slice(0, 5000)));
}

// 국내 주식형 현물 ETF 중 MVP 감시 대상
const WATCHED_ETF_CODES = [
  '069500', // KODEX 200
  '102110', // TIGER 200
  '091160', // KODEX 반도체
  '091230', // TIGER 반도체
  '396500', // TIGER 반도체TOP10
  '305540', // TIGER 2차전지테마
  '305720', // KODEX 2차전지산업
  '292150', // TIGER 코리아TOP10
  '161510', // PLUS 고배당주
];

// ─── KRX 크롤링 ──────────────────────────────────────────────────────────

function parseNumber(value) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPublicHoldings(holdings, asOf = getToday()) {
  return holdings.map(item => ({
    name: item.name,
    code: item.code,
    value: item.weight,
    weight: item.weight,
    shares: item.shares,
    amount: item.amount,
    source: item.source || 'Naver Finance',
    coverage: item.coverage || 'top10',
    asOf: item.asOf || asOf,
  }));
}

function decodeHtmlText(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractNaverTableValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<th[^>]*scope="row"[^>]*>\\s*${escaped}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`));
  return match ? decodeHtmlText(match[1]) : null;
}

function normalizeKoreanDate(value) {
  const match = value?.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : null;
}

async function fetchNaverEtfDetail(etfCode) {
  const response = await fetch(`https://finance.naver.com/item/main.naver?code=${etfCode}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!response.ok) throw new Error(`Naver ETF 상세 요청 실패: ${response.status}`);

  const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
  const feeMatch = html.match(/summary="펀드보수 정보"[\s\S]*?<td>\s*연\s*<em>([\d.]+)%<\/em>/);
  const providerMatch = html.match(/<th[^>]*>자산운용사<\/th>\s*<td>\s*<span[^>]*>([\s\S]*?)<\/span>/);
  const descriptionMatch = html.match(/<div id="summary_info"[^>]*>[\s\S]*?<h4>ETF개요<\/h4>\s*<p>([\s\S]*?)<\/p>/);

  return {
    benchmark: extractNaverTableValue(html, '기초지수'),
    fundType: extractNaverTableValue(html, '유형'),
    listingDate: normalizeKoreanDate(extractNaverTableValue(html, '상장일')),
    fee: feeMatch ? Number(feeMatch[1]) : null,
    provider: providerMatch ? decodeHtmlText(providerMatch[1]) : null,
    description: descriptionMatch ? decodeHtmlText(descriptionMatch[1]) : null,
    source: 'Naver Finance / FnGuide',
  };
}

async function fetchHoldingsFromNaver(etfCode) {
  const response = await fetch(`https://finance.naver.com/item/main.naver?code=${etfCode}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!response.ok) throw new Error(`Naver ETF 상세 요청 실패: ${response.status}`);

  const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
  const section = html.match(/<div class="section etf_asset">([\s\S]*?)<\/table>/)?.[1] || '';
  const rowPattern = /<a href="\/item\/main\.naver\?code=([0-9A-Z]+)">([\s\S]*?)<\/a>[\s\S]*?<td>\s*([\d,.-]+)\s*<\/td>[\s\S]*?<td class="per">\s*([\d,.]+)%/g;
  const holdings = [];
  let match;

  while ((match = rowPattern.exec(section)) !== null) {
    holdings.push({
      code: match[1],
      name: decodeHtmlText(match[2]),
      shares: parseNumber(match[3]),
      weight: parseNumber(match[4]),
      amount: 0,
      source: 'Naver Finance',
      coverage: 'top10',
      asOf: getPreviousWeekday(),
    });
  }

  if (holdings.length === 0) throw new Error('Naver ETF 상세에 구성종목이 없습니다.');
  return holdings.sort((a, b) => b.weight - a.weight);
}

async function fetchSupportedHoldings(etfCode) {
  return fetchHoldingsFromNaver(etfCode);
}

// ─── Diff 계산 ──────────────────────────────────────────────────────────

/**
 * 전일 vs 오늘 구성종목 비교
 * @param {Array} yesterday - 전일 holdings
 * @param {Array} today - 오늘 holdings
 * @returns {Object} diff
 */
function compareHoldings(yesterday, today) {
  const yesterdayMap = new Map(yesterday.map(h => [h.code, h]));
  const todayMap = new Map(today.map(h => [h.code, h]));

  // 신규 편입: 오늘 있고 전일 없는 종목
  const newEntries = today.filter(h => !yesterdayMap.has(h.code)).map(h => ({
    ...h,
    type: 'new',
    message: `신규 편입: ${h.name} (비중 ${h.weight.toFixed(2)}%)`,
  }));

  // 완전 편출: 전일 있고 오늘 없는 종목
  const removedEntries = yesterday.filter(h => !todayMap.has(h.code)).map(h => ({
    ...h,
    type: 'out',
    message: `완전 편출: ${h.name} (전일 비중 ${h.weight.toFixed(2)}%)`,
  }));

  // 비중 2% 이상 변동
  const weightChanges = today
    .filter(h => yesterdayMap.has(h.code))
    .map(h => {
      const prev = yesterdayMap.get(h.code);
      const delta = h.weight - prev.weight;
      return { ...h, prevWeight: prev.weight, delta, type: 'weight' };
    })
    .filter(h => Math.abs(h.delta) >= 2.0)
    .map(h => ({
      ...h,
      message: `비중 변동: ${h.name} (${h.prevWeight.toFixed(2)}% → ${h.weight.toFixed(2)}%, ${h.delta > 0 ? '+' : ''}${h.delta.toFixed(2)}%)`,
    }));

  // TOP5 순위 변동
  const yesterdayRanks = new Map(yesterday.slice(0, 5).map((h, i) => [h.code, i + 1]));
  const rankChanges = today.slice(0, 5)
    .filter(h => yesterdayRanks.has(h.code))
    .map((h, i) => {
      const prevRank = yesterdayRanks.get(h.code);
      const curRank = i + 1;
      return { ...h, prevRank, curRank, delta: prevRank - curRank, type: 'rank' };
    })
    .filter(h => h.delta !== 0)
    .map(h => ({
      ...h,
      message: `순위 변동: ${h.name} (${h.prevRank}위 → ${h.curRank}위)`,
    }));

  return { newEntries, removedEntries, weightChanges, rankChanges };
}

/**
 * 유의미한 변경사항이 있는지 판단
 */
function hasSignificantChange(diff) {
  return (
    diff.newEntries.length > 0 ||
    diff.removedEntries.length > 0 ||
    diff.weightChanges.length > 0 ||
    diff.rankChanges.length > 0
  );
}

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────

function getToday() {
  const d = new Date();
  // KST (+9)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function getPreviousWeekday() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return date.toISOString().slice(0, 10);
}

async function getLatestHoldingsSnapshot(etfCode, env) {
  if (!env.KV) return null;
  return env.KV.get(`snapshot:latest:${etfCode}`, 'json');
}

async function storeLatestHoldingsSnapshot(etfCode, holdings, asOf, env) {
  if (!env.KV) return;
  const normalized = holdings.map(item => ({ ...item, asOf }));
  await env.KV.put(`snapshot:latest:${etfCode}`, JSON.stringify({ asOf, holdings: normalized }));
  await env.KV.put(`etf:holdings:v3:${etfCode}`, JSON.stringify(toPublicHoldings(normalized, asOf)), {
    expirationTtl: 24 * 60 * 60,
  });
}

// ─── 스케줄러 핵심 로직 ───────────────────────────────────────────────────

/**
 * 특정 ETF의 구성종목 변경을 감지하고 KV에 저장합니다.
 */
export async function detectChanges(etfCode, env, asOf = getToday()) {
  const todayHoldings = (await fetchSupportedHoldings(etfCode)).map(item => ({ ...item, asOf }));

  if (!todayHoldings || todayHoldings.length === 0) {
    console.log(`[${etfCode}] 오늘 구성종목 없음 — 스킵`);
    return null;
  }

  // 월요일과 휴장일을 고려해 가장 최근 거래일 스냅샷을 조회합니다.
  const prevSnapshot = await getLatestHoldingsSnapshot(etfCode, env);

  if (!prevSnapshot) {
    await storeLatestHoldingsSnapshot(etfCode, todayHoldings, asOf, env);
    console.log(`[${etfCode}] 첫 스냅샷 저장 완료`);
    return { etfCode, asOf, changed: false, changes: [] };
  }

  if (prevSnapshot.asOf >= asOf) {
    return { etfCode, asOf, changed: false, skipped: 'already-checked', changes: [] };
  }

  const previousFeed = `${prevSnapshot.holdings?.[0]?.source || 'unknown'}:${prevSnapshot.holdings?.[0]?.coverage || 'unknown'}`;
  const currentFeed = `${todayHoldings[0]?.source || 'unknown'}:${todayHoldings[0]?.coverage || 'unknown'}`;
  if (previousFeed !== currentFeed) {
    await storeLatestHoldingsSnapshot(etfCode, todayHoldings, asOf, env);
    console.log(`[${etfCode}] 데이터 범위 변경(${previousFeed} -> ${currentFeed}) — 기준 스냅샷 재설정`);
    return { etfCode, asOf, changed: false, reset: true, changes: [] };
  }

  const diff = compareHoldings(prevSnapshot.holdings, todayHoldings);
  let allChanges = [];

  if (hasSignificantChange(diff)) {
    allChanges = [
      ...diff.newEntries,
      ...diff.removedEntries,
      ...diff.weightChanges,
      ...diff.rankChanges,
    ].map(c => ({
      code: etfCode,
      date: asOf,
      type: c.type,
      message: c.message,
      holdingCode: c.code,
      holdingName: c.name,
      previousWeight: c.prevWeight ?? (c.type === 'out' ? c.weight : null),
      weight: c.type === 'out' ? 0 : c.weight,
      previousRank: c.prevRank ?? null,
      rank: c.curRank ?? null,
      coverage: c.coverage || 'top10',
      source: c.source || 'Naver Finance',
      badge: c.type === 'new' ? '🆕 편입' : c.type === 'out' ? '❌ 편출' : c.type === 'rank' ? '↕️ 순위변동' : '⚖️ 비중변동',
    }));

    // ETF별 이력은 ETF마다 별도 키를 사용하므로 여기서 안전하게 갱신합니다.
    if (env.KV) {
      const historyKey = `history:${etfCode}`;
      const existingHistory = await env.KV.get(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      const newHistoryEntries = allChanges.map(c => ({
        ...c,
      }));
      const retainedHistory = history.filter(item => item.date !== asOf);
      const updatedHistory = [...newHistoryEntries, ...retainedHistory].slice(0, 1000);
      await env.KV.put(historyKey, JSON.stringify(updatedHistory), {
        expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60
      });
    }

    console.log(`[${etfCode}] 변경사항 감지: 신규 ${diff.newEntries.length}, 편출 ${diff.removedEntries.length}, 비중변동 ${diff.weightChanges.length}`);
  }

  if (hasSignificantChange(diff)) await storeLatestHoldingsSnapshot(etfCode, todayHoldings, asOf, env);

  return { etfCode, asOf, changed: allChanges.length > 0, diff, changes: allChanges };
}

// ─── 더미 Fallback 데이터 ────────────────────────────────────────────────
// 기존 프로토타입 기록이며 API 응답에는 사용하지 않습니다.
/* eslint-disable no-unused-vars */

const DUMMY_HOLDINGS_BY_CODE = {
  // 453950: TIGER TSMC파운드리밸류체인
  '453950': [
    { name: 'TSMC (ADR)', value: 24.5, code: 'TSM' },
    { name: 'NVIDIA Corp', value: 18.2, code: 'NVDA' },
    { name: 'ASML Holding', value: 12.8, code: 'ASML' },
    { name: 'Applied Materials', value: 9.5, code: 'AMAT' },
    { name: 'Tokyo Electron', value: 7.2, code: '8035' },
    { name: 'Lam Research', value: 5.4, code: 'LRCX' },
    { name: 'Broadcom Inc', value: 4.8, code: 'AVGO' },
    { name: 'MediaTek Inc', value: 3.9, code: '2454' },
    { name: 'Intel Corp', value: 3.5, code: 'INTC' },
    { name: 'SK하이닉스', value: 3.1, code: '000660' }
  ],
  // 305540: TIGER 2차전지테마
  '305540': [
    { name: 'LG에너지솔루션', value: 22.8, code: '373220' },
    { name: '에코프로비엠', value: 18.4, code: '247540' },
    { name: '포스코퓨처엠', value: 14.2, code: '003670' },
    { name: '삼성SDI', value: 12.5, code: '006400' },
    { name: '엘앤에프', value: 7.9, code: '066970' },
    { name: '에코프로', value: 6.8, code: '086520' },
    { name: 'LG화학', value: 5.4, code: '051910' },
    { name: 'SK아이이테크놀로지', value: 4.2, code: '361610' },
    { name: '코스모신소재', value: 3.8, code: '005070' },
    { name: '윤성에프앤씨', value: 2.1, code: '418170' }
  ],
  // 379800: KODEX 미국S&P500TR
  '379800': [
    { name: 'Microsoft Corp', value: 7.1, code: 'MSFT' },
    { name: 'Apple Inc', value: 6.8, code: 'AAPL' },
    { name: 'NVIDIA Corp', value: 6.1, code: 'NVDA' },
    { name: 'Amazon.com Inc', value: 3.8, code: 'AMZN' },
    { name: 'Alphabet Inc Class A', value: 2.3, code: 'GOOGL' },
    { name: 'Meta Platforms Inc', value: 2.1, code: 'META' },
    { name: 'Alphabet Inc Class C', value: 1.9, code: 'GOOG' },
    { name: 'Berkshire Hathaway Inc', value: 1.7, code: 'BRK.B' },
    { name: 'Eli Lilly & Co', value: 1.5, code: 'LLY' },
    { name: 'Broadcom Inc', value: 1.3, code: 'AVGO' }
  ],
  // 417630: TIGER KEDI혁신기업ESG30 — 국내 혁신기업 ESG 지수 추종
  '417630': [
    { name: '삼성전자', value: 14.8, code: '005930' },
    { name: 'SK하이닉스', value: 11.2, code: '000660' },
    { name: '현대차', value: 8.4, code: '005380' },
    { name: 'NAVER', value: 7.6, code: '035420' },
    { name: 'LG에너지솔루션', value: 6.9, code: '373220' },
    { name: '카카오', value: 5.8, code: '035720' },
    { name: '셀트리온', value: 5.2, code: '068270' },
    { name: 'KB금융', value: 4.7, code: '105560' },
    { name: '신한지주', value: 4.1, code: '055550' },
    { name: 'LG화학', value: 3.8, code: '051910' }
  ],
  // 360750: TIGER 미국S&P500
  '360750': [
    { name: 'Microsoft Corp', value: 7.1, code: 'MSFT' },
    { name: 'Apple Inc', value: 6.4, code: 'AAPL' },
    { name: 'NVIDIA Corp', value: 6.1, code: 'NVDA' },
    { name: 'Amazon.com Inc', value: 3.8, code: 'AMZN' },
    { name: 'Alphabet Inc Class A', value: 2.3, code: 'GOOGL' },
    { name: 'Meta Platforms Inc', value: 2.1, code: 'META' },
    { name: 'Alphabet Inc Class C', value: 1.9, code: 'GOOG' },
    { name: 'Berkshire Hathaway Inc', value: 1.7, code: 'BRK.B' },
    { name: 'Eli Lilly & Co', value: 1.5, code: 'LLY' },
    { name: 'Broadcom Inc', value: 1.3, code: 'AVGO' }
  ],
  // 133690: TIGER 미국나스닥100
  '133690': [
    { name: 'Microsoft Corp', value: 8.9, code: 'MSFT' },
    { name: 'Apple Inc', value: 8.5, code: 'AAPL' },
    { name: 'NVIDIA Corp', value: 7.8, code: 'NVDA' },
    { name: 'Amazon.com Inc', value: 5.2, code: 'AMZN' },
    { name: 'Alphabet Inc Class A', value: 4.9, code: 'GOOGL' },
    { name: 'Meta Platforms Inc', value: 4.2, code: 'META' },
    { name: 'Broadcom Inc', value: 3.8, code: 'AVGO' },
    { name: 'Tesla Inc', value: 3.5, code: 'TSLA' },
    { name: 'Alphabet Inc Class C', value: 3.2, code: 'GOOG' },
    { name: 'Netflix Inc', value: 2.8, code: 'NFLX' }
  ]
};

const DUMMY_CHANGES = [
  {
    code: '453950', etfName: 'TIGER TSMC파운드리밸류체인', type: 'swap',
    message: '1위 종목 교체: NVIDIA Corp ➡️ TSMC', date: '2026-06-02', badge: '🔄 변경'
  },
  {
    code: '379800', etfName: 'KODEX 미국S&P500TR', type: 'new',
    message: '신규 편입: Apple Inc (비중 6.8%)', date: '2026-06-02', badge: '🆕 편입'
  },
  {
    code: '305540', etfName: 'TIGER 2차전지테마', type: 'out',
    message: '완전 편출: 엘앤에프', date: '2026-06-01', badge: '❌ 편출'
  },
  {
    code: '417630', etfName: 'TIGER KEDI혁신기업ESG30', type: 'weight',
    message: '비중 변동: 카카오 (7.2% → 5.8%, -1.4%)', date: '2026-06-01', badge: '⚖️ 비중변동'
  },
  {
    code: '360750', etfName: 'TIGER 미국S&P500', type: 'weight',
    message: '비중 변동: NVIDIA Corp (4.1% → 6.1%, +2.0%)', date: '2026-06-01', badge: '⚖️ 비중변동'
  },
];

const DUMMY_HISTORY = {
  '453950': [
    { date: '2026-06-02', type: 'swap', message: '1위 종목 교체: NVIDIA Corp (비중 18.2%) ➡️ TSMC (비중 24.5%)' },
    { date: '2026-05-24', type: 'new', message: '신규 종목 편입: ASML Holding (비중 3.2% 편입)' },
    { date: '2026-05-10', type: 'weight', message: '기존 비중 확대: NVIDIA Corp 비중 변경 (14.5% ➡️ 18.2%)' },
    { date: '2026-04-28', type: 'out', message: '완전 종목 편출: 인텔 (비중 1.5% 제외)' }
  ],
  '305540': [
    { date: '2026-06-01', type: 'out', message: '완전 종목 편출: 엘앤에프 (비중 3.2% 제외)' },
    { date: '2026-05-15', type: 'weight', message: '에코프로비엠 비중 조절 (15.4% ➡️ 18.4%)' }
  ],
  '417630': [
    { date: '2026-06-01', type: 'weight', message: '비중 변동: 카카오 (7.2% → 5.8%, -1.4%)' },
    { date: '2026-05-20', type: 'new', message: '신규 편입: LG에너지솔루션 (비중 6.9%)' },
    { date: '2026-04-15', type: 'out', message: '완전 편출: 카카오뱅크 (비중 2.1% 제외)' }
  ],
  '360750': [
    { date: '2026-06-01', type: 'weight', message: '비중 변동: NVIDIA Corp (4.1% → 6.1%, +2.0%)' },
    { date: '2026-05-20', type: 'new', message: '신규 편입: Broadcom Inc (비중 1.3%)' }
  ]
};
/* eslint-enable no-unused-vars */

const ETF_NAME_MAP = {
  '091160': 'KODEX 반도체',
  '091230': 'TIGER 반도체',
  '396500': 'TIGER 반도체TOP10',
  '305540': 'TIGER 2차전지테마',
  '305720': 'KODEX 2차전지산업',
  '292150': 'TIGER 코리아TOP10',
  '161510': 'PLUS 고배당주',
  '069500': 'KODEX 200',
  '102110': 'TIGER 200',
};

// ─── fetch 핸들러 (API 프록시) ────────────────────────────────────────────

async function handleFetch(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // GET /api/etf/list or /api/rankings
    if (path === '/api/etf/list' || path === '/api/rankings') {
      const period = url.searchParams.get('period') || '1m';

      if (env.KV) {
        const cached = await env.KV.get(`etf:price_list:domestic-spot:v5:${period}`);
        if (cached) return new Response(cached, { headers: CORS_HEADERS });
      }

      const marketData = await fetchMarketEtfItems(env);
      const baseline = await getPriceBaseline(period, env);

      const mappedEtfs = marketData.items.map(item => {
        const baselinePrice = baseline?.prices?.[item.code];
        const historicalRate = baselinePrice > 0
          ? Number((((item.price - baselinePrice) / baselinePrice) * 100).toFixed(2))
          : null;
        return {
          code: item.code,
          name: item.name,
          marketScope: 'domestic-equity-spot',
          price: item.price,
          change: item.change,
          changeRate: item.changeRate,
          rate1d: Number(item.changeRate.toFixed(2)),
          rate1w: period === '1w' ? historicalRate : null,
          rate1m: period === '1m' ? historicalRate : null,
          rate3m: period === '3m' ? (historicalRate ?? item.rate3m) : null,
          rate1y: period === '1y' ? historicalRate : null,
          rate10y: period === '10y' ? historicalRate : null,
          baselineDate: baseline?.date || null,
          aum: item.netAssets ?? item.marketCap,
          assetValueType: item.netAssets != null ? 'netAssets' : 'marketCap',
          marketCap: item.marketCap,
          nav: item.nav,
          benchmark: item.benchmark,
          fee: null,
          volume: item.volume,
          source: item.source,
          asOf: marketData.asOf,
        };
      });

      const rateKey = period === '1d' ? 'rate1d' : period === '10y' ? 'rate10y' : `rate${period}`;
      const sortedEtfs = mappedEtfs.sort((a, b) => (b[rateKey] ?? -Infinity) - (a[rateKey] ?? -Infinity));
      const responseJson = JSON.stringify(sortedEtfs);

      if (env.KV) {
        await env.KV.put(`etf:price_list:domestic-spot:v5:${period}`, responseJson, { expirationTtl: 300 });
      }

      return new Response(responseJson, { headers: CORS_HEADERS });
    }

    if (path === '/api/health/data-source') {
      const configured = Boolean(env.KRX_API_KEY);
      const scheduler = env.KV ? await env.KV.get(SCHEDULER_STATUS_KEY, 'json') : null;
      if (!configured) {
        return new Response(JSON.stringify({ configured: false, authorized: false, source: 'Naver Finance', scheduler }), { headers: CORS_HEADERS });
      }
      try {
        const data = await fetchKrxEtfItems(env);
        return new Response(JSON.stringify({ configured: true, authorized: true, source: data.source, asOf: data.asOf, count: data.items.length, scheduler }), { headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ configured: true, authorized: false, source: 'Naver Finance', reason: error.message, scheduler }), { headers: CORS_HEADERS });
      }
    }

    // GET /api/compare?codes=069500,102110&period=1y
    if (path === '/api/compare') {
      const codes = [...new Set((url.searchParams.get('codes') || '').split(',').filter(Boolean))].slice(0, 4);
      const period = url.searchParams.get('period') || '1w';
      const days = period === '1d' ? 1 : PRICE_PERIOD_DAYS[period];

      if (codes.length === 0 || !days) {
        return new Response(JSON.stringify({ error: 'codes 또는 period가 올바르지 않습니다.' }), {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      const allSeries = env.KV ? await env.KV.get('prices:series', 'json') || {} : {};
      const cutoff = getDateDaysAgo(days);
      const selectedSeries = Object.fromEntries(codes.map(code => [
        code,
        (allSeries[code] || []).filter(point => point[0] >= cutoff),
      ]));
      const dates = [...new Set(Object.values(selectedSeries).flatMap(points => points.map(point => point[0])))].sort();
      const sampledDates = dates.length <= 80
        ? dates
        : dates.filter((_, index) => index % Math.ceil(dates.length / 80) === 0 || index === dates.length - 1);
      const priceMaps = Object.fromEntries(codes.map(code => [code, new Map(selectedSeries[code])]));
      const firstPrices = Object.fromEntries(codes.map(code => [code, selectedSeries[code][0]?.[1] || null]));
      const lastPrices = {};

      const data = sampledDates.map(date => {
        const row = { date };
        for (const code of codes) {
          const current = priceMaps[code].get(date);
          if (current != null) lastPrices[code] = current;
          const price = current ?? lastPrices[code];
          const base = firstPrices[code];
          row[code] = price != null && base > 0
            ? Number((((price - base) / base) * 100).toFixed(2))
            : null;
        }
        return row;
      });

      return new Response(JSON.stringify({ period, data }), { headers: CORS_HEADERS });
    }

    // GET /api/etf/:code/holdings
    const holdingsMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)\/holdings$/);
    if (holdingsMatch) {
      const code = holdingsMatch[1];

      if (env.KV) {
        const cached = await env.KV.get(`etf:holdings:v3:${code}`);
        if (cached) return new Response(cached, { headers: CORS_HEADERS });
      }

      let holdings = [];
      try {
        // 네이버 금융이 공개하는 전일 기준 TOP 10 구성종목을 조회합니다.
        holdings = await fetchSupportedHoldings(code);
      } catch (err) {
        console.error(`Naver TOP 10 구성종목 조회 실패 [${code}]:`, err);
      }

      if (!holdings || holdings.length === 0) {
        return new Response(JSON.stringify({
          error: '구성종목 데이터를 가져오지 못했습니다.',
          code,
          source: 'Naver Finance TOP 10',
        }), { status: 502, headers: CORS_HEADERS });
      }

      holdings = toPublicHoldings(holdings);

      const responseJson = JSON.stringify(holdings);
      if (env.KV) {
        await env.KV.put(`etf:holdings:v3:${code}`, responseJson, { expirationTtl: 3600 });
      }
      return new Response(responseJson, { headers: CORS_HEADERS });
    }

    // GET /api/etf/:code/changes (개별 ETF 변경 이력)
    const changesMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)\/changes$/);
    if (changesMatch) {
      const code = changesMatch[1];

      // KV에서 실제 이력 조회
      if (env.KV) {
        const kvHistory = await env.KV.get(`history:${code}`);
        if (kvHistory) return new Response(kvHistory, { headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify([]), { headers: CORS_HEADERS });
    }

    // GET /api/changes (오늘의 전체 변경사항)
    if (path === '/api/changes') {
      // KV에서 실제 변경사항 조회
      if (env.KV) {
        const latestDate = await env.KV.get(LATEST_CHANGES_KEY);
        const kvChanges = latestDate ? await env.KV.get(`changes:${latestDate}`) : null;
        if (kvChanges) {
          const parsed = JSON.parse(kvChanges);
          // ETF 이름 보강
          const enriched = parsed.map(c => ({
            ...c,
            etfName: c.etfName || ETF_NAME_MAP[c.code] || c.code,
          }));
          return new Response(JSON.stringify(enriched), { headers: CORS_HEADERS });
        }
      }

      return new Response(JSON.stringify([]), { headers: CORS_HEADERS });
    }

    // GET /api/changes/recent?days=90&limit=10
    if (path === '/api/changes/recent') {
      const days = Math.min(parseInt(url.searchParams.get('days') || '90', 10), CHANGE_RETENTION_DAYS);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);

      if (env.KV) {
        const cutoff = getDateDaysAgo(days - 1);
        const history = await env.KV.get('changes:history', 'json') || [];
        const latestDate = history.find(change => change.date >= cutoff)?.date;
        if (latestDate) {
          const enriched = history
            .filter(change => change.date === latestDate)
            .slice(0, limit)
            .map(change => ({
              ...change,
              etfName: change.etfName || ETF_NAME_MAP[change.code] || change.code,
            }));
          return new Response(JSON.stringify(enriched), { headers: CORS_HEADERS });
        }
      }

      return new Response(JSON.stringify([]), { headers: CORS_HEADERS });
    }

    // GET /api/changes/history?days=30 (최근 N일 변경 이력)
    if (path === '/api/changes/history') {
      const days = Math.min(parseInt(url.searchParams.get('days') || '7', 10), CHANGE_RETENTION_DAYS);
      const allHistory = [];

      if (env.KV) {
        const cutoff = getDateDaysAgo(days - 1);
        const history = await env.KV.get('changes:history', 'json') || [];
        allHistory.push(...history.filter(change => change.date >= cutoff));
      }

      if (allHistory.length === 0) {
        return new Response(JSON.stringify([]), { headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify(allHistory), { headers: CORS_HEADERS });
    }

    // GET /api/etf/:code
    const detailMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)$/);
    if (detailMatch) {
      const code = detailMatch[1];
      const marketData = await fetchMarketEtfItems(env);
      const item = marketData.items.find(etf => etf.code === code);
      if (!item) {
        return new Response(JSON.stringify({ error: '지원 대상 ETF를 찾지 못했습니다.', code }), {
          status: 404,
          headers: CORS_HEADERS,
        });
      }
      let naverDetail = {};
      try {
        naverDetail = await fetchNaverEtfDetail(code);
      } catch (error) {
        console.warn(`[${code}] Naver 상세정보 조회 실패: ${error.message}`);
      }
      const details = {
        code,
        name: item.name,
        provider: naverDetail.provider || getProviderFromName(item.name),
        listingDate: naverDetail.listingDate || null,
        fee: naverDetail.fee ?? null,
        aum: item.netAssets,
        netAssets: item.netAssets,
        marketCap: item.marketCap,
        price: item.price,
        nav: item.nav,
        changeRate: item.changeRate,
        benchmark: item.benchmark || naverDetail.benchmark || null,
        fundType: naverDetail.fundType || null,
        description: naverDetail.description || null,
        source: `${marketData.source} + ${naverDetail.source || 'Naver Finance'}`,
        asOf: marketData.asOf,
      };
      return new Response(JSON.stringify(details), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: CORS_HEADERS
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

// ─── scheduled 핸들러 (Cron) ─────────────────────────────────────────────

async function handleScheduled(event, env) {
  const expectedDate = getToday();
  const trigger = event?.cron || 'manual';
  const previousStatus = env.KV ? await env.KV.get(SCHEDULER_STATUS_KEY, 'json') : null;
  console.log(`[Cron] 종가 및 TOP 10 변경 수집 시작: ${expectedDate} (${trigger})`);

  if (previousStatus?.lastSuccessDate === expectedDate) {
    console.log(`[Cron] ${expectedDate} 수집이 이미 완료되어 재시도를 건너뜁니다.`);
    return;
  }

  let marketData;
  try {
    marketData = await fetchMarketEtfItems(env);
    if (env.KRX_API_KEY && marketData.source !== 'KRX Open API') {
      throw new Error(`KRX_FALLBACK_${marketData.fallbackReason || 'UNKNOWN'}`);
    }
    if (marketData.asOf !== expectedDate) {
      if (env.KV) {
        await env.KV.put(SCHEDULER_STATUS_KEY, JSON.stringify({
          state: 'waiting-for-close',
          trigger,
          expectedDate,
          marketAsOf: marketData.asOf,
          lastAttemptAt: new Date().toISOString(),
          lastSuccessDate: previousStatus?.lastSuccessDate || null,
        }));
      }
      console.log(`[Cron] KRX 최신 기준일 ${marketData.asOf}; ${expectedDate} 데이터 게시 전이므로 재시도를 기다립니다.`);
      return;
    }
    await storeDailyPriceSnapshot(marketData.items, env, marketData.asOf);
    console.log(`[Cron] 국내 현물 ETF 종가 스냅샷 저장: ${marketData.items.length}개 (${marketData.source})`);
  } catch (error) {
    console.error(`[Cron] 종가 스냅샷 저장 실패: ${error.message}`);
    if (env.KV) {
      await env.KV.put(SCHEDULER_STATUS_KEY, JSON.stringify({
        state: 'failed',
        trigger,
        expectedDate,
        reason: error.message,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessDate: previousStatus?.lastSuccessDate || null,
      }));
    }
    return;
  }

  const results = [];
  for (const code of WATCHED_ETF_CODES) {
    try {
      results.push({ status: 'fulfilled', value: await detectChanges(code, env, marketData.asOf) });
    } catch (reason) {
      results.push({ status: 'rejected', reason });
    }
  }

  let succeeded = 0, failed = 0;
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      succeeded++;
    } else {
      failed++;
      console.error(`[${WATCHED_ETF_CODES[i]}] 실패: ${result.reason}`);
    }
  });

  if (env.KV) {
    const changes = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value?.changes || []);
    if (changes.length > 0) {
      await env.KV.put(`changes:${marketData.asOf}`, JSON.stringify(changes), {
        expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60,
      });
      await env.KV.put(LATEST_CHANGES_KEY, marketData.asOf);
      await storeChangesHistory(changes, env, marketData.asOf);
    }
    await env.KV.put(SCHEDULER_STATUS_KEY, JSON.stringify({
      state: failed === 0 ? 'success' : 'partial',
      trigger,
      expectedDate,
      marketAsOf: marketData.asOf,
      source: marketData.source,
      etfCount: marketData.items.length,
      holdingsSucceeded: succeeded,
      holdingsFailed: failed,
      changes: changes.length,
      lastAttemptAt: new Date().toISOString(),
      lastSuccessDate: marketData.asOf,
    }));
  }

  console.log(`[Cron] 완료 — 성공: ${succeeded}, 실패: ${failed}`);
}

// ─── Export ───────────────────────────────────────────────────────────────

export default {
  fetch: handleFetch,
  scheduled: handleScheduled,
};
