export const THEME_RULES = [
  { id: 'semi', name: '반도체', pattern: /코리아테크TOP10|반도체|SK하이닉스|삼성전자/ },
  { id: 'valueup', name: '밸류업', pattern: /밸류업/ },
  { id: 'index', name: '지수', pattern: /코스피|코스닥|KOSPI|KOSDAQ|(?:^|\s)(?:200|100)액티브|코스닥?150액티브/i },
  { id: 'battery', name: '2차전지', pattern: /2차전지|배터리|전고체|양극재|리튬/ },
  { id: 'ai-robot', name: 'AI·로봇', pattern: /인공지능|로봇|휴머노이드|딥러닝|소프트웨어|온디바이스|(?:^|[^A-Z])AI(?:[^A-Z]|$)/i },
  { id: 'defense', name: '방산·우주', pattern: /방산|우주|항공/ },
  { id: 'ship', name: '조선·해운', pattern: /조선|해운/ },
  { id: 'bio', name: '바이오·헬스케어', pattern: /바이오|헬스케어|의료|제약|CDMO/ },
  { id: 'finance', name: '금융·고배당', pattern: /금융|은행|증권|보험|고배당|배당|리츠|주주환원/ },
  { id: 'auto', name: '자동차', pattern: /자동차|현대차|모빌리티/ },
  { id: 'energy', name: '에너지·전력', pattern: /원자력|원전|전력|에너지|수소|태양광|신재생|ESS/ },
  { id: 'content', name: '콘텐츠·게임', pattern: /게임|콘텐츠|미디어|웹툰|드라마|K-POP|엔터|인터넷/ },
  { id: 'consumer', name: '소비·여행', pattern: /화장품|여행|레저|소비|K-푸드|생활소비/ },
  { id: 'industry', name: '산업재·인프라', pattern: /건설|기계|철강|인프라|설비|산업재/ },
];

export const ETC_THEME = { id: 'etc', name: '전략·기타', pattern: /./ };

export function getThemeSearchText(etf) {
  return etf?.name || '';
}

export function themeMatchesEtf(theme, etf) {
  return theme.pattern.test(getThemeSearchText(etf));
}

export function getEtfTheme(etf) {
  return THEME_RULES.find(theme => themeMatchesEtf(theme, etf)) || ETC_THEME;
}
