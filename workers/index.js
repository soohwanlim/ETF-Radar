// workers/index.js
// Cloudflare Workers — ETF Radar 통합 엔트리포인트
// - fetch: API 프록시 (기존 proxy.js 내용)
// - scheduled: Cron 스케줄러 (평일 오후 4시 KST = UTC 07:00)

// ─── 상수 ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=utf-8'
};

const CHANGE_RETENTION_DAYS = 365;
const PRICE_PERIOD_DAYS = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  '10y': 3650,
};

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

async function storeDailyPriceSnapshot(items, env) {
  if (!env.KV) return;

  const today = getToday();
  const prices = Object.fromEntries(items.map(item => [item.itemcode, item.nowVal]));
  const dates = await env.KV.get('prices:dates', 'json') || [];
  const updatedDates = [...new Set([...dates, today])].sort().slice(-3700);
  const series = await env.KV.get('prices:series', 'json') || {};

  for (const item of items) {
    const points = series[item.itemcode] || [];
    const withoutToday = points.filter(point => point[0] !== today);
    const updated = [...withoutToday, [today, item.nowVal]].sort((a, b) => a[0].localeCompare(b[0]));
    const recentCutoff = getDateDaysAgo(400);
    const monthEnds = new Map();
    for (const point of updated) {
      if (point[0] < recentCutoff) monthEnds.set(point[0].slice(0, 7), point);
    }
    series[item.itemcode] = [
      ...monthEnds.values(),
      ...updated.filter(point => point[0] >= recentCutoff),
    ].sort((a, b) => a[0].localeCompare(b[0]));
  }

  await env.KV.put(`prices:${today}`, JSON.stringify(prices), {
    expirationTtl: 11 * 365 * 24 * 60 * 60,
  });
  await env.KV.put('prices:dates', JSON.stringify(updatedDates));
  await env.KV.put('prices:series', JSON.stringify(series));
}

async function storeChangesHistory(changes, env) {
  if (!env.KV || changes.length === 0) return;

  const existing = await env.KV.get('changes:history', 'json') || [];
  const today = getToday();
  const cutoff = getDateDaysAgo(CHANGE_RETENTION_DAYS - 1);
  const retained = existing.filter(change => change.date !== today && change.date >= cutoff);
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

/**
 * KRX 데이터시스템에서 ETF 구성종목을 가져옵니다 (2-step OTP 방식).
 * @param {string} etfCode - ETF 단축코드 (6자리)
 * @returns {Array} holdings - [{ name, code, weight, shares, value }]
 */
function parseNumber(value) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeKrxHoldings(items) {
  const normalized = items.map(item => ({
    name: item.COMPST_ISU_NM || item.ISU_NM || item.isuNm || '',
    code: item.COMPST_ISU_SRT_CD || item.ISU_SRT_CD || item.isuSrtCd || '',
    explicitWeight: parseNumber(item.COMPST_RTO || item.WGHT || item.wghtRt),
    shares: parseNumber(item.COMPST_ISU_CU1_SHRS || item.STRT_VALU || item.CU1_SHRS),
    amount: parseNumber(item.VALU_AMT || item.EVLU_AMT || item.AMT),
  })).filter(item => item.name && (item.code || item.amount > 0 || item.explicitWeight > 0));

  const totalAmount = normalized.reduce((sum, item) => sum + item.amount, 0);

  return normalized.map(item => {
    const weight = item.explicitWeight > 0
      ? item.explicitWeight
      : totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;

    return {
      name: item.name,
      code: item.code,
      weight: Number(weight.toFixed(4)),
      shares: item.shares,
      amount: item.amount,
      source: 'KRX PDF',
      coverage: 'full',
    };
  }).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);
}

function toPublicHoldings(holdings, asOf = getToday()) {
  return holdings.map(item => ({
    name: item.name,
    code: item.code,
    value: item.weight,
    weight: item.weight,
    shares: item.shares,
    amount: item.amount,
    source: item.source || 'KRX PDF',
    coverage: item.coverage || 'full',
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
  try {
    return await fetchHoldingsFromKRX(etfCode);
  } catch (krxError) {
    console.warn(`[${etfCode}] KRX PDF 실패, Naver 상위 구성종목으로 대체: ${krxError.message}`);
    return fetchHoldingsFromNaver(etfCode);
  }
}

async function fetchHoldingsFromKRX(etfCode) {
  const KRX_BASE = 'https://data.krx.co.kr';

  // Step 1: OTP 토큰 획득
  const otpForm = new URLSearchParams({
    locale: 'ko_KR',
    tboxisuCd_finder_secuprodisu1_1: etfCode,
    isuCd: etfCode,
    isuCd2: '',
    mdcMenuId: 'MDC0201020506',
    bldId: 'dbms/MDC/STAT/standard/MDCSTAT61101',
    codeNm: '',
    param1isuCd_finder_secuprodisu1_1: '',
    pagePath: '/contents/MDC/STAT/standard/MDCSTAT61101.cmd',
    bld: 'dbms/MDC/STAT/standard/MDCSTAT61101',
  });

  const otpRes = await fetch(`${KRX_BASE}/comm/bldAttendant/getJsonData.cmd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': `${KRX_BASE}/contents/MDC/STAT/standard/MDCSTAT61101.cmd`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: otpForm.toString(),
  });

  if (!otpRes.ok) {
    throw new Error(`KRX OTP 요청 실패: ${otpRes.status}`);
  }

  const otpData = await otpRes.json();

  // Step 2: OTP 토큰 없이 직접 JSON 데이터 파싱 (KRX는 실제로 OTP 없이도 응답)
  // KRX API는 bld 파라미터로 직접 데이터를 반환하는 경우가 많음
  const items = otpData?.output || otpData?.OutBlock_1 || [];

  if (!Array.isArray(items) || items.length === 0) {
    // Fallback: 다른 KRX 엔드포인트 시도
    return await fetchHoldingsFromKRXAlt(etfCode);
  }

  const holdings = normalizeKrxHoldings(items);
  if (holdings.length === 0) throw new Error('KRX PDF 응답에 유효한 구성종목이 없습니다.');
  return holdings;
}

/**
 * KRX 대체 엔드포인트: ETF 구성종목 (ETF PDF 기준)
 */
async function fetchHoldingsFromKRXAlt(etfCode) {
  const today = getToday().replace(/-/g, '');

  const body = new URLSearchParams({
    bld: 'dbms/MDC/STAT/standard/MDCSTAT61101',
    locale: 'ko_KR',
    isuCd: etfCode,
    trdDd: today,
    share: '1',
    money: '1',
    csvxls_isNo: 'false',
  });

  const res = await fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT61101.cmd',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`KRX 대체 요청 실패: ${res.status}`);

  const data = await res.json();
  const items = data?.output || data?.OutBlock_1 || [];

  const holdings = normalizeKrxHoldings(items);
  if (holdings.length === 0) throw new Error('KRX PDF 응답에 유효한 구성종목이 없습니다.');
  return holdings;
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

async function getLatestPreviousSnapshot(etfCode, today, env) {
  if (!env.KV) return null;

  const prefix = `snapshot:${etfCode}:`;
  const listed = await env.KV.list({ prefix, limit: 100 });
  const previousKey = listed.keys
    .map(item => item.name)
    .filter(name => name.slice(prefix.length) < today)
    .sort()
    .at(-1);

  if (!previousKey) return null;
  const holdings = await env.KV.get(previousKey, 'json');
  return holdings ? { key: previousKey, holdings } : null;
}

// ─── 스케줄러 핵심 로직 ───────────────────────────────────────────────────

/**
 * 특정 ETF의 구성종목 변경을 감지하고 KV에 저장합니다.
 */
async function detectChanges(etfCode, env) {
  const today = getToday();

  const todayHoldings = await fetchSupportedHoldings(etfCode);

  if (!todayHoldings || todayHoldings.length === 0) {
    console.log(`[${etfCode}] 오늘 구성종목 없음 — 스킵`);
    return null;
  }

  // 월요일과 휴장일을 고려해 가장 최근 거래일 스냅샷을 조회합니다.
  const prevSnapshot = await getLatestPreviousSnapshot(etfCode, today, env);

  if (!prevSnapshot) {
    // 첫 실행 — 스냅샷만 저장
    if (env.KV) {
      await env.KV.put(`snapshot:${etfCode}:${today}`, JSON.stringify(todayHoldings), {
        expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60
      });
      await env.KV.put(`etf:holdings:v3:${etfCode}`, JSON.stringify(toPublicHoldings(todayHoldings, today)), {
        expirationTtl: 3600
      });
    }
    console.log(`[${etfCode}] 첫 스냅샷 저장 완료`);
    return null;
  }

  const previousFeed = `${prevSnapshot.holdings[0]?.source || 'unknown'}:${prevSnapshot.holdings[0]?.coverage || 'unknown'}`;
  const currentFeed = `${todayHoldings[0]?.source || 'unknown'}:${todayHoldings[0]?.coverage || 'unknown'}`;
  if (previousFeed !== currentFeed) {
    if (env.KV) {
      await env.KV.put(`snapshot:${etfCode}:${today}`, JSON.stringify(todayHoldings), {
        expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60
      });
      await env.KV.put(`etf:holdings:v3:${etfCode}`, JSON.stringify(toPublicHoldings(todayHoldings, today)), {
        expirationTtl: 3600
      });
    }
    console.log(`[${etfCode}] 데이터 범위 변경(${previousFeed} -> ${currentFeed}) — 기준 스냅샷 재설정`);
    return null;
  }

  const diff = compareHoldings(prevSnapshot.holdings, todayHoldings);
  let allChanges = [];

  if (hasSignificantChange(diff)) {
    allChanges = [
      ...diff.newEntries,
      ...diff.removedEntries,
      ...diff.weightChanges,
    ].map(c => ({
      code: etfCode,
      date: today,
      type: c.type,
      message: c.message,
      badge: c.type === 'new' ? '🆕 편입' : c.type === 'out' ? '❌ 편출' : '⚖️ 비중변동',
    }));

    // ETF별 이력은 ETF마다 별도 키를 사용하므로 여기서 안전하게 갱신합니다.
    if (env.KV) {
      const historyKey = `history:${etfCode}`;
      const existingHistory = await env.KV.get(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      const newHistoryEntries = allChanges.map(c => ({
        date: today,
        type: c.type,
        message: c.message,
      }));
      const updatedHistory = [...newHistoryEntries, ...history].slice(0, 1000);
      await env.KV.put(historyKey, JSON.stringify(updatedHistory), {
        expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60
      });
    }

    console.log(`[${etfCode}] 변경사항 감지: 신규 ${diff.newEntries.length}, 편출 ${diff.removedEntries.length}, 비중변동 ${diff.weightChanges.length}`);
  }

  // 오늘 스냅샷 저장 & 90일 이전 삭제
  if (env.KV) {
    await env.KV.put(`snapshot:${etfCode}:${today}`, JSON.stringify(todayHoldings), {
      expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60
    });

    // holdings 캐시 갱신
    await env.KV.put(`etf:holdings:v3:${etfCode}`, JSON.stringify(toPublicHoldings(todayHoldings, today)), {
      expirationTtl: 3600
    });
  }

  return { etfCode, diff, changes: allChanges };
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
        const cached = await env.KV.get(`etf:price_list:domestic-spot:v4:${period}`);
        if (cached) return new Response(cached, { headers: CORS_HEADERS });
      }

      const naverItems = await fetchNaverEtfItems();
      const baseline = await getPriceBaseline(period, env);

      const mappedEtfs = naverItems.map(item => {
        const rate3m = item.threeMonthEarnRate || 0;
        const changeRate = item.changeRate || 0;
        const baselinePrice = baseline?.prices?.[item.itemcode];
        const historicalRate = baselinePrice > 0
          ? Number((((item.nowVal - baselinePrice) / baselinePrice) * 100).toFixed(2))
          : null;
        return {
          code: item.itemcode,
          name: item.itemname,
          marketScope: 'domestic-equity-spot',
          price: item.nowVal,
          change: item.changeVal * (item.risefall === '5' || item.risefall === '4' ? -1 : 1),
          changeRate,
          rate1d: parseFloat(changeRate.toFixed(2)),
          rate1w: period === '1w' ? historicalRate : null,
          rate1m: period === '1m' ? historicalRate : null,
          rate3m: parseFloat(rate3m.toFixed(2)),
          rate1y: period === '1y' ? historicalRate : null,
          rate10y: period === '10y' ? historicalRate : null,
          baselineDate: baseline?.date || null,
          aum: Math.round(item.marketSum || 100),
          fee: null,
          volume: item.quant || 0
        };
      });

      const rateKey = period === '1d' ? 'rate1d' : period === '10y' ? 'rate10y' : `rate${period}`;
      const sortedEtfs = mappedEtfs.sort((a, b) => (b[rateKey] ?? -Infinity) - (a[rateKey] ?? -Infinity));
      const responseJson = JSON.stringify(sortedEtfs);

      if (env.KV) {
        await env.KV.put(`etf:price_list:domestic-spot:v4:${period}`, responseJson, { expirationTtl: 300 });
      }

      return new Response(responseJson, { headers: CORS_HEADERS });
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
        // 실제 KRX 데이터시스템에서 실시간 구성종목 크롤링 시도
        holdings = await fetchSupportedHoldings(code);
      } catch (err) {
        console.error(`실시간 KRX 구성종목 조회 실패 [${code}]:`, err);
      }

      if (!holdings || holdings.length === 0) {
        return new Response(JSON.stringify({
          error: '구성종목 데이터를 가져오지 못했습니다.',
          code,
          source: 'KRX PDF / Naver Finance',
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
        const today = getToday();
        const kvChanges = await env.KV.get(`changes:${today}`);
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

    // GET /api/themes
    if (path === '/api/themes') {
      const themes = [
        { id: 'semi', name: '반도체', etfs: ['453950', '463810', '091160'] },
        { id: 'nuclear', name: '원자력', etfs: ['427110', '455500'] },
        { id: 'battery', name: '2차전지', etfs: ['305540', '261240'] }
      ];
      return new Response(JSON.stringify(themes), { headers: CORS_HEADERS });
    }

    // GET /api/etf/:code
    const detailMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)$/);
    if (detailMatch) {
      const code = detailMatch[1];
      const details = {
        code,
        name: ETF_NAME_MAP[code] || 'KODEX 200',
        provider: code === '453950' ? '신한자산운용' : code.startsWith('4') ? '삼성자산운용' : '미래에셋자산운용',
        listingDate: '2023-04-25',
        fee: code === '453950' ? 0.30 : 0.45,
        aum: 3120,
        distributionCycle: '연 1회 (4월)'
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
  console.log(`[Cron] ETF 구성종목 변경 감지 시작: ${getToday()}`);

  try {
    const priceItems = await fetchNaverEtfItems();
    await storeDailyPriceSnapshot(priceItems, env);
    console.log(`[Cron] 국내 현물 ETF 종가 스냅샷 저장: ${priceItems.length}개`);
  } catch (error) {
    console.error(`[Cron] 종가 스냅샷 저장 실패: ${error.message}`);
  }

  const results = [];
  for (const code of WATCHED_ETF_CODES) {
    try {
      results.push({ status: 'fulfilled', value: await detectChanges(code, env) });
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
    await env.KV.put(`changes:${getToday()}`, JSON.stringify(changes), {
      expirationTtl: CHANGE_RETENTION_DAYS * 24 * 60 * 60,
    });
    await storeChangesHistory(changes, env);
  }

  console.log(`[Cron] 완료 — 성공: ${succeeded}, 실패: ${failed}`);
}

// ─── Export ───────────────────────────────────────────────────────────────

export default {
  fetch: handleFetch,
  scheduled: handleScheduled,
};
