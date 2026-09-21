import { isKrxTradingDate, previousKrxTradingDate } from '../src/data/marketCalendar.js';

const DEFAULT_STATUS_URL = 'https://etf-radar.net/data/status.json';
const MIN_ETF_COUNT = 300;
const MAX_BUSINESS_DAY_LAG = 0;
const MARKET_DATA_READY_HOUR_KST = 18;
const ROUTE_CHECK_CONCURRENCY = 12;

function parseArgs(argv) {
  const options = { url: process.env.STATUS_URL || DEFAULT_STATUS_URL };
  for (const arg of argv) {
    if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
  }
  return options;
}

function toKstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

function latestExpectedBusinessDate(now = new Date()) {
  const kst = toKstParts(now);
  if (!isKrxTradingDate(kst.date)) return previousKrxTradingDate(kst.date);
  if (kst.hour < MARKET_DATA_READY_HOUR_KST) return previousKrxTradingDate(kst.date);
  return kst.date;
}

function businessDayLag(expectedDate, actualDate) {
  if (actualDate >= expectedDate) return 0;
  let lag = 0;
  let cursor = expectedDate;
  while (cursor > actualDate) {
    cursor = previousKrxTradingDate(cursor);
    lag += 1;
  }
  return lag;
}

async function fetchStatus(url) {
  const response = await fetch(`${url}?healthCheck=${Date.now()}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`status.json request failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function auditSitemapRoutes(statusUrl) {
  const sitemapUrl = new URL('/sitemap.xml', statusUrl);
  const targetOrigin = sitemapUrl.origin;
  const response = await fetch(sitemapUrl, {
    headers: { accept: 'application/xml' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`sitemap.xml request failed: HTTP ${response.status}`);

  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  if (!urls.length) throw new Error('sitemap.xml contains no URLs');

  const problems = [];
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const canonicalUrl = urls[cursor++];
      const url = new URL(new URL(canonicalUrl).pathname, targetOrigin).href;
      try {
        const routeResponse = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(10_000),
        });
        if (routeResponse.status !== 200) {
          const location = routeResponse.headers.get('location');
          problems.push(`${url} returned ${routeResponse.status}${location ? ` -> ${location}` : ''}`);
        }
      } catch (error) {
        problems.push(`${url} request failed: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(ROUTE_CHECK_CONCURRENCY, urls.length) }, worker));
  return { routeCount: urls.length, problems };
}

function evaluateStatus(status, now = new Date()) {
  const problems = [];
  const latestExpected = latestExpectedBusinessDate(now);
  const asOfDate = /^\d{4}-\d{2}-\d{2}$/.test(status.asOf || '') ? status.asOf : null;

  if (status.state !== 'success') {
    problems.push(`state is ${status.state || 'missing'}`);
  }
  if (!asOfDate) {
    problems.push(`invalid asOf: ${status.asOf || 'missing'}`);
  } else {
    const lag = businessDayLag(latestExpected, asOfDate);
    if (lag > MAX_BUSINESS_DAY_LAG) {
      problems.push(`asOf ${status.asOf} is ${lag} trading days behind expected ${latestExpected}`);
    }
  }
  if ((status.etfCount || 0) < MIN_ETF_COUNT) {
    problems.push(`etfCount ${status.etfCount || 0} is below ${MIN_ETF_COUNT}`);
  }
  if ((status.failedCount || 0) > 0) {
    problems.push(`failedCount is ${status.failedCount}`);
  }

  if (Number(status.holdingIndexCount || 0) < 1) problems.push('holdingIndexCount is zero; reverse holding lookup is unavailable');
  if (Number(status.populatedHoldingCount || 0) < 1) problems.push('populatedHoldingCount is zero; ETF holding snapshots are unavailable');

  return {
    ok: problems.length === 0,
    problems,
    expectedAsOf: latestExpected,
    statusSummary: {
      lastCheckState: status.lastCheckState || 'n/a',
      latestAvailableAsOf: status.latestAvailableAsOf || 'n/a',
    },
  };
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  const status = await fetchStatus(url);
  const result = evaluateStatus(status);
  const routeAudit = await auditSitemapRoutes(url);
  result.problems.push(...routeAudit.problems);
  result.ok = result.problems.length === 0;

  console.log(`Status URL: ${url}`);
  console.log(`asOf=${status.asOf || 'n/a'} expected=${result.expectedAsOf} state=${status.state || 'n/a'} lastCheck=${result.statusSummary.lastCheckState} latestAvailable=${result.statusSummary.latestAvailableAsOf} etfs=${status.etfCount || 0} failed=${status.failedCount || 0}`);
  console.log(`Sitemap routes checked: ${routeAudit.routeCount}`);

  if (!result.ok) {
    console.error(`Health check failed:\n- ${result.problems.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
