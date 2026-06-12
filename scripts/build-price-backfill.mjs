import { writeFile, mkdir } from 'node:fs/promises';

const NAVER_LIST_URL = 'https://finance.naver.com/api/sise/etfItemList.nhn';
const OUTPUT_DIR = new URL('../backfill/', import.meta.url);
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const RECENT_DAILY_MS = 400 * 24 * 60 * 60 * 1000;

const excludedPatterns = [
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

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(date) {
  return formatDate(date).replaceAll('-', '');
}

function isSupported(item) {
  return [1, 2].includes(Number(item.etfTabCode))
    && !excludedPatterns.some(pattern => pattern.test(item.itemname || ''));
}

async function fetchText(url, encoding = 'utf-8') {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return new TextDecoder(encoding).decode(await response.arrayBuffer());
}

async function fetchEtfs() {
  const data = JSON.parse(await fetchText(NAVER_LIST_URL, 'euc-kr'));
  return (data?.result?.etfItemList || []).filter(isSupported);
}

async function fetchPrices(code, startDate, endDate) {
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&startTime=${compactDate(startDate)}&endTime=${compactDate(endDate)}&timeframe=day`;
  const text = await fetchText(url, 'euc-kr');
  const rows = [...text.matchAll(/\["(20\d{6})",\s*\d+,\s*\d+,\s*\d+,\s*(\d+),/g)];
  return rows.map(match => ({
    date: `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`,
    close: Number(match[2]),
  })).filter(item => item.close > 0);
}

function shouldKeepDate(dateString, newestDate, monthEnds) {
  const time = new Date(`${dateString}T00:00:00Z`).getTime();
  if (newestDate.getTime() - time <= RECENT_DAILY_MS) return true;
  return monthEnds.has(dateString);
}

async function main() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - TEN_YEARS_MS - 45 * 24 * 60 * 60 * 1000);
  const etfs = await fetchEtfs();
  const allPrices = new Map();

  for (const [index, etf] of etfs.entries()) {
    try {
      const prices = await fetchPrices(etf.itemcode, startDate, endDate);
      for (const price of prices) {
        if (!allPrices.has(price.date)) allPrices.set(price.date, {});
        allPrices.get(price.date)[etf.itemcode] = price.close;
      }
      console.log(`[${index + 1}/${etfs.length}] ${etf.itemcode} ${etf.itemname}`);
    } catch (error) {
      console.warn(`[skip] ${etf.itemcode}: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  const dates = [...allPrices.keys()].sort();
  const monthEnds = new Set();
  for (const date of dates) {
    const month = date.slice(0, 7);
    const previous = [...monthEnds].find(item => item.startsWith(month));
    if (previous) monthEnds.delete(previous);
    monthEnds.add(date);
  }

  const retainedDates = dates.filter(date => shouldKeepDate(date, endDate, monthEnds));
  const series = Object.fromEntries(etfs.map(etf => [etf.itemcode, []]));
  for (const date of retainedDates) {
    for (const [code, close] of Object.entries(allPrices.get(date))) {
      if (series[code]) series[code].push([date, close]);
    }
  }
  const bulk = retainedDates.map(date => ({
    key: `prices:${date}`,
    value: JSON.stringify(allPrices.get(date)),
    expiration_ttl: 11 * 365 * 24 * 60 * 60,
  }));
  bulk.push({ key: 'prices:dates', value: JSON.stringify(retainedDates) });
  bulk.push({ key: 'prices:series', value: JSON.stringify(series) });

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(new URL('price-history-kv.json', OUTPUT_DIR), JSON.stringify(bulk));
  await writeFile(new URL('price-history-summary.json', OUTPUT_DIR), JSON.stringify({
    generatedAt: new Date().toISOString(),
    etfCount: etfs.length,
    firstDate: retainedDates[0],
    lastDate: retainedDates.at(-1),
    snapshotCount: retainedDates.length,
  }, null, 2));

  console.log(`완료: ${etfs.length}개 ETF, ${retainedDates.length}개 가격 스냅샷`);
}

await main();
