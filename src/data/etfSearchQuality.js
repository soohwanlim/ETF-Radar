export const ETF_SEARCH_QUALITY = Object.freeze({
  minimumDescriptionLength: 80,
  minimumHoldings: 3,
});

export function meetsEtfSearchQuality(etf, holdings = []) {
  if (!etf || !/^[0-9A-Z]{6}$/.test(etf.code || '')) return false;
  return Boolean(
    etf.name?.trim()
    && etf.description?.trim().length >= ETF_SEARCH_QUALITY.minimumDescriptionLength
    && etf.provider?.trim()
    && etf.listingDate
    && etf.asOf
    && Number.isFinite(etf.price)
    && etf.price > 0
    && Array.isArray(holdings)
    && holdings.length >= ETF_SEARCH_QUALITY.minimumHoldings,
  );
}

export function getEtfMeta(etf, indexable = false) {
  if (!etf) {
    return {
      title: 'ETF 상세 정보를 찾을 수 없습니다 | ETF Radar',
      description: '요청한 ETF 상세 정보를 찾을 수 없습니다. ETF Radar 홈에서 지원하는 국내 ETF를 검색해 주세요.',
      robots: 'noindex, follow',
    };
  }

  const returns = [
    Number.isFinite(etf.rate1m) ? `1개월 ${etf.rate1m}%` : null,
    Number.isFinite(etf.rate3m) ? `3개월 ${etf.rate3m}%` : null,
    Number.isFinite(etf.rate1y) ? `1년 ${etf.rate1y}%` : null,
  ].filter(Boolean).join(', ');

  return {
    title: `${etf.name} (${etf.code}) 수익률·구성종목 | ETF Radar`,
    description: `${etf.name} (${etf.code})의 ${returns || '기간별 수익률'}, 기준가와 TOP 10 구성종목 변화 및 ETF Radar 분석을 확인합니다.`,
    robots: indexable ? 'index, follow' : 'noindex, follow',
  };
}
