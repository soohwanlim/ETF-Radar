const cache = new Map();

async function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error(`정적 데이터 요청 실패: ${path}`);
      return response.json();
    }));
  }
  return cache.get(path);
}

export function loadEtfs() {
  return loadJson('/data/etfs.json');
}

export function loadDataStatus() {
  return loadJson('/data/status.json');
}

export async function loadEtf(code) {
  const etfs = await loadEtfs();
  return etfs.find(etf => etf.code === code) || null;
}

export async function loadHoldings(code) {
  const holdings = await loadJson('/data/holdings.json');
  return holdings[code] || [];
}

export async function loadEtfHistory(code) {
  const history = await loadJson('/data/changes/history.json');
  return history.filter(change => change.code === code);
}

export function loadLatestChanges() {
  return loadJson('/data/changes/latest.json');
}

export function loadChangesHistory() {
  return loadJson('/data/changes/history.json');
}

export function loadThemeSignals() {
  return loadJson('/data/theme-signals.json');
}

export function loadListings() {
  return loadJson('/data/listings.json');
}

function getCutoffDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function loadCompareData(codes, period) {
  const periodDays = { '1d': 1, '1w': 7, '1m': 30, '3m': 90, '1y': 365, '10y': 3650 };
  const days = periodDays[period];
  const allSeries = await loadJson('/data/price-series.json');
  const cutoff = getCutoffDate(days);
  const selected = Object.fromEntries(codes.map(code => [
    code,
    (allSeries[code] || []).filter(point => point[0] >= cutoff),
  ]));
  const dates = [...new Set(Object.values(selected).flatMap(points => points.map(point => point[0])))].sort();
  const sampledDates = dates.length <= 80
    ? dates
    : dates.filter((_, index) => index % Math.ceil(dates.length / 80) === 0 || index === dates.length - 1);
  const maps = Object.fromEntries(codes.map(code => [code, new Map(selected[code])]));
  const first = Object.fromEntries(codes.map(code => [code, selected[code][0]?.[1] || null]));
  const last = {};

  return sampledDates.map(date => {
    const row = { date };
    for (const code of codes) {
      const current = maps[code].get(date);
      if (current != null) last[code] = current;
      const price = current ?? last[code];
      row[code] = price != null && first[code] > 0
        ? Number((((price - first[code]) / first[code]) * 100).toFixed(2))
        : null;
    }
    return row;
  });
}
