export const SIGNAL_THEME_RULES = [
  { id: 'semi', name: '반도체', pattern: /반도체|SK하이닉스|삼성전자/ },
  { id: 'battery', name: '2차전지', pattern: /2차전지|배터리|전고체|양극재|리튬/ },
  { id: 'ai-robot', name: 'AI·로봇', pattern: /인공지능|로봇|휴머노이드|딥러닝|소프트웨어|(?:^|[^A-Z])AI(?:[^A-Z]|$)/i },
  { id: 'defense', name: '방산·우주', pattern: /방산|우주|항공/ },
  { id: 'ship', name: '조선·해운', pattern: /조선|해운/ },
  { id: 'bio', name: '바이오·헬스케어', pattern: /바이오|헬스케어|의료|제약|CDMO/ },
  { id: 'finance', name: '금융·고배당', pattern: /금융|은행|증권|보험|고배당|배당|리츠|주주환원|밸류업/ },
  { id: 'auto', name: '자동차', pattern: /자동차|현대차|모빌리티/ },
  { id: 'energy', name: '에너지·전력', pattern: /원자력|원전|전력|에너지|수소|태양광|신재생|ESS/ },
  { id: 'content', name: '콘텐츠·게임', pattern: /게임|콘텐츠|미디어|웹툰|드라마|K-POP|엔터|인터넷/ },
  { id: 'consumer', name: '소비·여행', pattern: /화장품|여행|레저|소비|K-푸드|생활소비/ },
  { id: 'industry', name: '산업재·인프라', pattern: /건설|기계|철강|인프라|설비|산업재/ },
];

export function buildThemeSignals(etfs = [], changes = [], themes = SIGNAL_THEME_RULES) {
  const etfMap = new Map(etfs.map(etf => [etf.code, etf]));
  const signals = [];

  for (const theme of themes) {
    const themeEtfs = etfs.filter(etf => theme.pattern.test(etf.name));
    const themeCodes = new Set(themeEtfs.map(etf => etf.code));
    const grouped = new Map();

    for (const change of changes) {
      if (!themeCodes.has(change.code)) continue;
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

  return signals.sort((a, b) => b.etfCount - a.etfCount || b.coverageRate - a.coverageRate || a.holdingName.localeCompare(b.holdingName, 'ko'));
}
