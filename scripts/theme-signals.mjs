import { THEME_RULES as SIGNAL_THEME_RULES, themeMatchesEtf } from '../src/data/themeRules.js';

export function buildThemeSignals(etfs = [], changes = [], themes = SIGNAL_THEME_RULES) {
  const etfMap = new Map(etfs.map(etf => [etf.code, etf]));
  const signals = [];

  for (const theme of themes) {
    const themeEtfs = etfs.filter(etf => themeMatchesEtf(theme, etf));
    const themeCodes = new Set(themeEtfs.map(etf => etf.code));
    const grouped = new Map();

    for (const change of changes) {
      if (!themeCodes.has(change.code)) continue;
      if (!['quantity_increase', 'quantity_decrease', 'quantity_decrease_weight_held'].includes(change.classification)) continue;
      const delta = change.shareChangeRate;
      if (!Number.isFinite(delta) || delta === 0) continue;

      const direction = delta > 0 ? 'increase' : 'decrease';
      const key = `${change.holdingCode}:${direction}`;
      const group = grouped.get(key) || {
        holdingCode: change.holdingCode,
        holdingName: change.holdingName,
        direction,
        date: change.date,
        shareChangeRates: [],
        weightDeltas: [],
        etfs: new Map(),
      };
      group.etfs.set(change.code, {
        code: change.code,
        name: etfMap.get(change.code)?.name || change.etfName,
        type: change.classification,
        shareChange: change.shareChange,
        shareChangeRate: Number(delta.toFixed(2)),
        weightDelta: Number((change.weight - change.previousWeight).toFixed(2)),
      });
      group.shareChangeRates.push(delta);
      group.weightDeltas.push(change.weight - change.previousWeight);
      grouped.set(key, group);
    }

    for (const group of grouped.values()) {
      const affectedEtfs = [...group.etfs.values()];
      if (affectedEtfs.length < 2) continue;
      const ratio = affectedEtfs.length / themeEtfs.length;
      signals.push({
        themeId: theme.id,
        themeName: theme.name,
        date: group.date,
        holdingCode: group.holdingCode,
        holdingName: group.holdingName,
        direction: group.direction,
        etfCount: affectedEtfs.length,
        themeEtfCount: themeEtfs.length,
        coverageRate: Number((ratio * 100).toFixed(1)),
        signalType: 'per_cu_quantity',
        averageShareChangeRate: Number((group.shareChangeRates.reduce((sum, value) => sum + value, 0) / group.shareChangeRates.length).toFixed(2)),
        averageWeightDelta: Number((group.weightDeltas.reduce((sum, value) => sum + value, 0) / group.weightDeltas.length).toFixed(2)),
        confidence: affectedEtfs.length >= 3 || ratio >= 0.5 ? 'high' : 'medium',
        etfs: affectedEtfs,
        coverage: 'top10',
        source: 'Naver Finance',
      });
    }
  }

  for (const theme of themes) {
    const themeEtfs = etfs.filter(etf => themeMatchesEtf(theme, etf));
    const themeCodes = new Set(themeEtfs.map(etf => etf.code));
    const grouped = new Map();

    for (const change of changes) {
      if (!themeCodes.has(change.code)) continue;
      if (['quantity_increase', 'quantity_decrease', 'quantity_decrease_weight_held'].includes(change.classification)) continue;
      const delta = change.type === 'new'
        ? change.weight
        : change.type === 'out'
          ? -change.previousWeight
          : change.weight - change.previousWeight;
      if (!Number.isFinite(delta) || delta === 0) continue;

      const direction = delta > 0 ? 'increase' : 'decrease';
      const key = `${change.holdingCode}:${direction}`;
      const group = grouped.get(key) || {
        holdingCode: change.holdingCode,
        holdingName: change.holdingName,
        direction,
        date: change.date,
        newCount: 0,
        outCount: 0,
        weightDeltas: [],
        etfs: new Map(),
      };
      group.etfs.set(change.code, {
        code: change.code,
        name: etfMap.get(change.code)?.name || change.etfName,
        type: change.type,
        delta: Number(delta.toFixed(2)),
      });
      if (change.type === 'new') group.newCount += 1;
      else if (change.type === 'out') group.outCount += 1;
      else group.weightDeltas.push(delta);
      grouped.set(key, group);
    }

    for (const group of grouped.values()) {
      const affectedEtfs = [...group.etfs.values()];
      if (affectedEtfs.length < 2) continue;
      const ratio = affectedEtfs.length / themeEtfs.length;
      signals.push({
        themeId: theme.id,
        themeName: theme.name,
        date: group.date,
        holdingCode: group.holdingCode,
        holdingName: group.holdingName,
        direction: group.direction,
        etfCount: affectedEtfs.length,
        themeEtfCount: themeEtfs.length,
        coverageRate: Number((ratio * 100).toFixed(1)),
        signalType: 'top10_common',
        newCount: group.newCount,
        outCount: group.outCount,
        weightCount: group.weightDeltas.length,
        averageWeightDelta: group.weightDeltas.length
          ? Number((group.weightDeltas.reduce((sum, value) => sum + value, 0) / group.weightDeltas.length).toFixed(2))
          : null,
        confidence: affectedEtfs.length >= 3 || ratio >= 0.5 ? 'high' : 'medium',
        etfs: affectedEtfs,
        coverage: 'top10',
        source: 'Naver Finance',
      });
    }
  }

  return signals.sort((a, b) => b.date.localeCompare(a.date)
    || (a.signalType === 'per_cu_quantity' ? -1 : 1) - (b.signalType === 'per_cu_quantity' ? -1 : 1)
    || b.etfCount - a.etfCount
    || Math.abs(b.averageShareChangeRate || b.averageWeightDelta || 0) - Math.abs(a.averageShareChangeRate || a.averageWeightDelta || 0)
    || a.holdingName.localeCompare(b.holdingName, 'ko'));
}
