import { getEtfTheme } from '../src/data/themeRules.js';

export function isActiveEtf(etf = {}) {
  return /액티브|Active/i.test(`${etf.name || ''} ${etf.description || ''}`);
}

export function buildHoldingIndex(etfs = [], holdingsByEtf = {}, metadata = {}) {
  const etfByCode = new Map(etfs.map(etf => [etf.code, etf]));
  const grouped = new Map();

  for (const [etfCode, holdings] of Object.entries(holdingsByEtf)) {
    const etf = etfByCode.get(etfCode);
    if (!etf || !Array.isArray(holdings)) continue;

    const theme = getEtfTheme(etf);
    const active = isActiveEtf(etf);

    for (const holding of holdings) {
      if (!holding?.code || !holding?.name) continue;

      const current = grouped.get(holding.code) || {
        code: holding.code,
        name: holding.name,
        etfs: [],
      };

      current.name = holding.name;
      current.etfs.push({
        code: etf.code,
        name: etf.name,
        weight: holding.weight ?? holding.value ?? null,
        shares: holding.shares ?? null,
        asOf: holding.asOf || etf.asOf || metadata.asOf || null,
        themeId: theme.id,
        themeName: theme.name,
        active,
      });

      grouped.set(holding.code, current);
    }
  }

  const items = [...grouped.values()]
    .map(item => {
      item.etfs.sort((a, b) => {
        const weightDiff = (b.weight ?? -Infinity) - (a.weight ?? -Infinity);
        if (weightDiff !== 0) return weightDiff;
        return a.name.localeCompare(b.name, 'ko');
      });

      const themeMap = new Map();
      for (const etf of item.etfs) {
        const theme = themeMap.get(etf.themeId) || {
          id: etf.themeId,
          name: etf.themeName,
          count: 0,
        };
        theme.count += 1;
        themeMap.set(etf.themeId, theme);
      }

      const themes = [...themeMap.values()].sort((a, b) => {
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        return a.name.localeCompare(b.name, 'ko');
      });

      return {
        code: item.code,
        name: item.name,
        etfCount: item.etfs.length,
        activeEtfCount: item.etfs.filter(etf => etf.active).length,
        themeCount: themes.length,
        themes,
        etfs: item.etfs,
      };
    })
    .sort((a, b) => {
      const countDiff = b.etfCount - a.etfCount;
      if (countDiff !== 0) return countDiff;
      return a.name.localeCompare(b.name, 'ko');
    });

  return {
    generatedAt: metadata.generatedAt || new Date().toISOString(),
    asOf: metadata.asOf || etfs.find(etf => etf.asOf)?.asOf || null,
    coverage: 'top10',
    count: items.length,
    items,
  };
}
