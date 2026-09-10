const NON_STOCK_NAME_PATTERN = /현금|예금|원화|외화|선물|스왑|채권|콜론|미수금|기타자산/i;

export function isLinkableHolding(holding) {
  return /^\d{6}$/.test(holding?.code || '')
    && typeof holding?.name === 'string'
    && holding.name.trim().length > 0
    && !NON_STOCK_NAME_PATTERN.test(holding.name);
}

export function getHoldingChanges(history = [], code) {
  return history.filter(change => change.holdingCode === code);
}

export function calculateHoldingAnalysis(holding, changes = []) {
  if (!holding) return null;
  const weightedEtfs = (holding.etfs || []).filter(etf => Number.isFinite(etf.weight));
  const totalTop10Weight = Number(weightedEtfs.reduce((sum, etf) => sum + etf.weight, 0).toFixed(2));
  const counts = changes.reduce((result, change) => {
    if (change.type === 'new') result.entries += 1;
    else if (change.type === 'out') result.exits += 1;
    else if (change.classification === 'quantity_increase') result.increases += 1;
    else if (change.classification === 'quantity_decrease' || change.classification === 'quantity_decrease_weight_held') result.decreases += 1;
    return result;
  }, { entries: 0, exits: 0, increases: 0, decreases: 0 });

  return {
    totalTop10Weight,
    topEtfs: weightedEtfs.slice(0, 5),
    latestChangeDate: changes.reduce((latest, change) => change.date > latest ? change.date : latest, ''),
    changeCount: changes.length,
    ...counts,
  };
}

export function meetsHoldingSearchQuality(holding, changes = []) {
  return Boolean(
    isLinkableHolding(holding)
    && holding.asOf
    && holding.etfCount >= 3
    && (holding.etfs || []).filter(etf => Number.isFinite(etf.weight)).length >= 3
    && (holding.activeEtfCount > 0 || changes.length > 0),
  );
}

export function getHoldingMeta(holding, indexable = false) {
  if (!holding) {
    return {
      title: 'ETF 구성종목 정보를 찾을 수 없습니다 | ETF Radar',
      description: '요청한 구성종목 정보를 찾을 수 없습니다. ETF Radar에서 국내 ETF의 TOP 10 구성종목 변화를 확인해 주세요.',
      robots: 'noindex, follow',
    };
  }
  return {
    title: `${holding.name} (${holding.code}) 보유 ETF·구성 변화 | ETF Radar`,
    description: `${holding.name}을 TOP 10 구성자산으로 보유한 ETF ${holding.etfCount}개와 주요 비중, 액티브 ETF 및 최근 구성 변화를 확인합니다.`,
    robots: indexable ? 'index, follow' : 'noindex, follow',
  };
}
