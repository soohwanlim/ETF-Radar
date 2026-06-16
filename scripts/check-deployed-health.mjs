const DEFAULT_STATUS_URL = 'https://etf-radar.net/data/status.json';
const MIN_ETF_COUNT = 300;
const MAX_BUSINESS_DAY_LAG = 0;

function parseArgs(argv) {
  const options = { url: process.env.STATUS_URL || DEFAULT_STATUS_URL };
  for (const arg of argv) {
    if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
  }
  return options;
}

function toKstDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function parseDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  return new Date(`${dateString}T00:00:00+09:00`);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function previousBusinessDate(date) {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() - 1);
  } while (isWeekend(next));
  return next;
}

function businessDayLag(expectedDate, actualDate) {
  if (actualDate >= expectedDate) return 0;
  let lag = 0;
  let cursor = new Date(expectedDate);
  while (cursor > actualDate) {
    cursor = previousBusinessDate(cursor);
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

function evaluateStatus(status, now = new Date()) {
  const problems = [];
  const todayKst = parseDate(toKstDate(now));
  const latestExpected = isWeekend(todayKst) ? previousBusinessDate(todayKst) : todayKst;
  const asOfDate = parseDate(status.asOf);

  if (status.state !== 'success') {
    problems.push(`state is ${status.state || 'missing'}`);
  }
  if (!asOfDate) {
    problems.push(`invalid asOf: ${status.asOf || 'missing'}`);
  } else {
    const lag = businessDayLag(latestExpected, asOfDate);
    if (lag > MAX_BUSINESS_DAY_LAG) {
      problems.push(`asOf ${status.asOf} is ${lag} business days behind expected ${toKstDate(latestExpected)}`);
    }
  }
  if ((status.etfCount || 0) < MIN_ETF_COUNT) {
    problems.push(`etfCount ${status.etfCount || 0} is below ${MIN_ETF_COUNT}`);
  }
  if ((status.failedCount || 0) > 0) {
    problems.push(`failedCount is ${status.failedCount}`);
  }

  return {
    ok: problems.length === 0,
    problems,
    expectedAsOf: toKstDate(latestExpected),
  };
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  const status = await fetchStatus(url);
  const result = evaluateStatus(status);

  console.log(`Status URL: ${url}`);
  console.log(`asOf=${status.asOf || 'n/a'} expected=${result.expectedAsOf} state=${status.state || 'n/a'} etfs=${status.etfCount || 0} failed=${status.failedCount || 0}`);

  if (!result.ok) {
    console.error(`Health check failed:\n- ${result.problems.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
