export const PERIOD_DAYS = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  '10y': 3650,
};

export const EXCLUDED_ETF_NAME_PATTERNS = [
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

export function isSupportedDomesticSpotEtf(item) {
  return [1, 2].includes(Number(item.etfTabCode))
    && !EXCLUDED_ETF_NAME_PATTERNS.some(pattern => pattern.test(item.itemname || ''));
}

export function parseNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function decodeHtmlText(value = '') {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function parseNaverHoldings(html, asOf) {
  const section = html.match(/<div class="section etf_asset">([\s\S]*?)<\/table>/)?.[1] || '';
  const rowPattern = /<a href="\/item\/main\.naver\?code=([0-9A-Z]+)">([\s\S]*?)<\/a>[\s\S]*?<td>\s*([\d,.-]+)\s*<\/td>[\s\S]*?<td class="per">\s*([\d,.]+)%/g;
  const holdings = [];
  let match;
  while ((match = rowPattern.exec(section)) !== null) {
    holdings.push({
      code: match[1],
      name: decodeHtmlText(match[2]),
      shares: parseNumber(match[3]),
      value: parseNumber(match[4]),
      weight: parseNumber(match[4]),
      source: 'Naver Finance',
      coverage: 'top10',
      asOf,
    });
  }
  return holdings.sort((a, b) => b.weight - a.weight);
}

export function calculateRate(series, asOf, days) {
  if (!series?.length) return null;
  const current = series.at(-1);
  const target = new Date(`${asOf}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  const targetDate = target.toISOString().slice(0, 10);
  const baseline = [...series].reverse().find(point => point[0] <= targetDate);
  if (!baseline || !baseline[1] || !current[1]) return null;
  return Number((((current[1] - baseline[1]) / baseline[1]) * 100).toFixed(2));
}

export function compareHoldings(previous = [], current = []) {
  const previousMap = new Map(previous.map(item => [item.code, item]));
  const currentMap = new Map(current.map(item => [item.code, item]));
  const changes = [];

  for (const item of current) {
    if (!previousMap.has(item.code)) {
      changes.push({
        type: 'new', classification: 'top10_new', holdingCode: item.code, holdingName: item.name,
        previousWeight: null, weight: item.weight, previousShares: null, shares: item.shares,
        shareChange: null, shareChangeRate: null,
      });
    }
  }
  for (const item of previous) {
    if (!currentMap.has(item.code)) {
      changes.push({
        type: 'out', classification: 'top10_out', holdingCode: item.code, holdingName: item.name,
        previousWeight: item.weight, weight: 0, previousShares: item.shares, shares: null,
        shareChange: null, shareChangeRate: null,
      });
    }
  }
  for (const item of current) {
    const before = previousMap.get(item.code);
    if (!before) continue;
    const weightDelta = item.weight - before.weight;
    const shareChange = item.shares - before.shares;
    const shareChangeRate = before.shares > 0 ? (shareChange / before.shares) * 100 : null;
    const hasMaterialShareChange = Number.isFinite(shareChangeRate)
      && Math.abs(shareChange) >= 1
      && Math.abs(shareChangeRate) >= 0.5;
    if (hasMaterialShareChange || Math.abs(weightDelta) >= 2) {
      changes.push({
        type: 'weight',
        classification: hasMaterialShareChange
          ? shareChange > 0 ? 'quantity_increase' : 'quantity_decrease'
          : 'price_effect',
        holdingCode: item.code, holdingName: item.name,
        previousWeight: before.weight, weight: item.weight,
        previousShares: before.shares, shares: item.shares, shareChange,
        shareChangeRate: Number.isFinite(shareChangeRate) ? Number(shareChangeRate.toFixed(2)) : null,
      });
    }
  }
  return changes;
}

export function formatChange(change) {
  if (change.classification === 'quantity_increase' || change.classification === 'quantity_decrease') {
    const sign = change.shareChange > 0 ? '+' : '';
    return `1CU당 구성수량 변화: ${change.holdingName} (${change.previousShares.toLocaleString()}주 → ${change.shares.toLocaleString()}주, ${sign}${change.shareChangeRate.toFixed(2)}%)`;
  }
  if (change.type === 'new') return `TOP 10 진입: ${change.holdingName} (비중 ${change.weight.toFixed(2)}%)`;
  if (change.type === 'out') return `TOP 10 이탈: ${change.holdingName} (이전 비중 ${change.previousWeight.toFixed(2)}%)`;
  const delta = change.weight - change.previousWeight;
  return `비중 변동: ${change.holdingName} (${change.previousWeight.toFixed(2)}% → ${change.weight.toFixed(2)}%, ${delta > 0 ? '+' : ''}${delta.toFixed(2)}%)`;
}

export function compactSeries(series, asOf) {
  const cutoff = new Date(`${asOf}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 400);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const monthEnds = new Map();
  for (const point of series) {
    if (point[0] < cutoffDate) monthEnds.set(point[0].slice(0, 7), point);
  }
  return [...monthEnds.values(), ...series.filter(point => point[0] >= cutoffDate)]
    .sort((a, b) => a[0].localeCompare(b[0]));
}
