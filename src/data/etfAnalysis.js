export const RETURN_PERIODS = ['1d', '1w', '1m', '3m', '1y', '10y'];

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function asFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export function calculateReturnRank(etfs, code, period) {
  if (!RETURN_PERIODS.includes(period)) return null;
  const rateKey = `rate${period}`;
  const ranked = etfs
    .filter(etf => asFiniteNumber(etf[rateKey]) != null)
    .sort((a, b) => b[rateKey] - a[rateKey] || a.code.localeCompare(b.code));
  const target = ranked.find(etf => etf.code === code);
  if (!target) return null;

  const rank = ranked.findIndex(etf => etf[rateKey] === target[rateKey]) + 1;
  return {
    period,
    rate: target[rateKey],
    rank,
    total: ranked.length,
    percentile: ranked.length === 1 ? 100 : round(((ranked.length - rank) / (ranked.length - 1)) * 100, 1),
  };
}

export function calculateReturnRanks(etfs, code) {
  return Object.fromEntries(RETURN_PERIODS.map(period => [period, calculateReturnRank(etfs, code, period)]));
}

export function compareWithBenchmark(etf, benchmarkEtf, period) {
  if (!RETURN_PERIODS.includes(period) || !etf || !benchmarkEtf) return null;
  const rateKey = `rate${period}`;
  const rate = asFiniteNumber(etf[rateKey]);
  const benchmarkRate = asFiniteNumber(benchmarkEtf[rateKey]);
  if (rate == null || benchmarkRate == null) return null;

  return {
    period,
    rate,
    benchmarkCode: benchmarkEtf.code,
    benchmarkName: benchmarkEtf.name,
    benchmarkRate,
    difference: round(rate - benchmarkRate),
  };
}

export function calculateHoldingConcentration(holdings) {
  const valid = holdings
    .filter(holding => asFiniteNumber(holding.weight) != null && holding.weight >= 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
  if (valid.length === 0) return null;

  const top3Weight = round(valid.slice(0, 3).reduce((sum, holding) => sum + holding.weight, 0));
  const top10Weight = round(valid.reduce((sum, holding) => sum + holding.weight, 0));
  const level = top3Weight >= 60 ? 'high' : top3Weight >= 40 ? 'medium' : 'distributed';

  return {
    holdingCount: valid.length,
    topHolding: {
      code: valid[0].code,
      name: valid[0].name,
      weight: valid[0].weight,
    },
    top3Weight,
    top10Weight,
    level,
    coverage: 'top10',
  };
}

function cutoffDate(asOf, days) {
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

function countClassifications(changes) {
  const counts = {
    total: changes.length,
    top10New: 0,
    top10Out: 0,
    quantityIncrease: 0,
    quantityDecrease: 0,
    quantityDecreaseWeightHeld: 0,
  };
  const keys = {
    top10_new: 'top10New',
    top10_out: 'top10Out',
    quantity_increase: 'quantityIncrease',
    quantity_decrease: 'quantityDecrease',
    quantity_decrease_weight_held: 'quantityDecreaseWeightHeld',
  };
  for (const change of changes) {
    const key = keys[change.classification];
    if (key) counts[key] += 1;
  }
  return counts;
}

export function calculateChangeActivity(changes, asOf) {
  const dated = changes
    .filter(change => typeof change.date === 'string' && change.date <= asOf)
    .sort((a, b) => b.date.localeCompare(a.date));
  const sevenDayCutoff = cutoffDate(asOf, 7);
  const thirtyDayCutoff = cutoffDate(asOf, 30);
  if (!sevenDayCutoff || !thirtyDayCutoff) return null;

  return {
    asOf,
    latestDate: dated[0]?.date || null,
    sevenDays: countClassifications(dated.filter(change => change.date >= sevenDayCutoff)),
    thirtyDays: countClassifications(dated.filter(change => change.date >= thirtyDayCutoff)),
  };
}

export function calculateHoldingSimilarity(firstHoldings, secondHoldings) {
  const first = new Map(firstHoldings.filter(item => item.code).map(item => [item.code, item]));
  const second = new Map(secondHoldings.filter(item => item.code).map(item => [item.code, item]));
  const allCodes = new Set([...first.keys(), ...second.keys()]);
  if (allCodes.size === 0) return null;


  const commonCodes = [...first.keys()].filter(code => second.has(code)).sort();
  const weightedOverlap = round(commonCodes.reduce((sum, code) => {
    const firstWeight = asFiniteNumber(first.get(code).weight) || 0;
    const secondWeight = asFiniteNumber(second.get(code).weight) || 0;
    return sum + Math.min(firstWeight, secondWeight);
  }, 0));

  return {
    commonCodes,
    commonCount: commonCodes.length,
    unionCount: allCodes.size,
    jaccardRate: round((commonCodes.length / allCodes.size) * 100, 1),
    weightedOverlap,
  };
}

export function findSimilarEtfs(targetCode, etfs, holdingsByCode, limit = 3) {
  const targetHoldings = holdingsByCode[targetCode] || [];
  if (targetHoldings.length === 0) return [];

  return etfs
    .filter(etf => etf.code !== targetCode && (holdingsByCode[etf.code] || []).length > 0)
    .map(etf => ({
      code: etf.code,
      name: etf.name,
      ...calculateHoldingSimilarity(targetHoldings, holdingsByCode[etf.code]),
    }))
    .filter(result => result.commonCount > 0)
    .sort((a, b) => b.commonCount - a.commonCount
      || b.weightedOverlap - a.weightedOverlap
      || b.jaccardRate - a.jaccardRate
      || a.code.localeCompare(b.code))
    .slice(0, Math.max(0, limit));
}
