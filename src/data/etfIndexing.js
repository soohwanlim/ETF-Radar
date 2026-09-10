const INDEXABLE_RATE_KEYS = ['rate1d', 'rate1w', 'rate1m', 'rate3m', 'rate1y', 'rate10y'];

export function getEtfIndexability(etf, holdings) {
  const reasons = [];
  if (!etf?.code || !etf?.name) reasons.push('identity');
  if (!etf?.provider) reasons.push('provider');
  if (!etf?.asOf) reasons.push('asOf');
  if ((etf?.description?.trim().length || 0) < 80) reasons.push('description');
  if ((holdings?.length || 0) < 5) reasons.push('holdings');
  if (INDEXABLE_RATE_KEYS.filter(key => Number.isFinite(etf?.[key])).length < 3) reasons.push('returns');
  return { indexable: reasons.length === 0, reasons };
}

export function selectIndexableEtfs(etfs, holdingsByCode) {
  return etfs.filter(etf => getEtfIndexability(etf, holdingsByCode[etf.code] || []).indexable);
}
