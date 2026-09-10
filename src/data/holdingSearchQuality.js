const NON_EQUITY_NAME_PATTERN = /(?:현금|원화|외화|예금|채권|국고채|통안채|회사채|전자단기사채|CP|선물|옵션|스왑|파생|REPO|콜론)/i;
const ETF_NAME_PATTERN = /^(?:KODEX|TIGER|RISE|ACE|SOL|PLUS|HANARO|TIMEFOLIO|KoAct|히어로즈|FOCUS|마이티|KIWOOM|1Q|WON|BNK|IBK)\s/i;

export function isLinkableHolding(holding = {}) {
  const code = String(holding.code || '').trim().toUpperCase();
  const name = String(holding.name || '').trim();
  return /^[0-9A-Z]{6}$/.test(code)
    && Boolean(name)
    && !NON_EQUITY_NAME_PATTERN.test(name)
    && !ETF_NAME_PATTERN.test(name);
}

export function meetsHoldingSearchQuality(holding = {}) {
  return isLinkableHolding(holding)
    && Boolean(holding.asOf)
    && Number(holding.etfCount) >= 2
    && Array.isArray(holding.etfs)
    && holding.etfs.length >= 2;
}

export function getHoldingMeta(holding, indexable = false) {
  if (!holding || !isLinkableHolding(holding)) {
    return {
      title: '구성종목을 찾을 수 없습니다 | ETF Radar',
      description: '요청한 국내 주식 구성종목 정보를 찾을 수 없습니다.',
      robots: 'noindex, follow',
    };
  }

  const topEtf = holding.etfs?.[0];
  const description = `${holding.name}(${holding.code})을 TOP 10에 보유한 ETF ${holding.etfCount}개${topEtf ? `와 주요 ETF ${topEtf.name}의 비중` : ''}, 최근 구성 변화를 확인합니다.`;
  return {
    title: `${holding.name} 보유 ETF와 구성종목 변화 | ETF Radar`,
    description,
    robots: indexable ? 'index, follow' : 'noindex, follow',
  };
}
