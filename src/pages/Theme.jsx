import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid, Cpu, BatteryCharging, Bot, Shield, Ship, HeartPulse,
  Landmark, Car, Zap, MonitorPlay, Building2, Loader2, TrendingUp,
} from 'lucide-react';
import { useETFData } from '../hooks/useETFData';
import { loadHoldings } from '../data/staticData';
import ETFIcon from '../components/ETFIcon';

const PERIODS = [
  { id: '1w', label: '1주' },
  { id: '1m', label: '1개월' },
];

const THEME_RULES = [
  { id: 'semi', name: '반도체', icon: Cpu, pattern: /반도체|SK하이닉스|삼성전자/ },
  { id: 'battery', name: '2차전지', icon: BatteryCharging, pattern: /2차전지|배터리|전고체|양극재/ },
  { id: 'ai-robot', name: 'AI·로봇', icon: Bot, pattern: /인공지능|로봇|휴머노이드|온디바이스|(?:^|[^A-Z])AI(?:[^A-Z]|$)/ },
  { id: 'defense', name: '방산·우주', icon: Shield, pattern: /방산|우주|항공/ },
  { id: 'ship', name: '조선·해운', icon: Ship, pattern: /조선|해운/ },
  { id: 'bio', name: '바이오·헬스케어', icon: HeartPulse, pattern: /바이오|헬스케어|의료|제약/ },
  { id: 'finance', name: '금융·고배당', icon: Landmark, pattern: /금융|은행|증권|보험|고배당|배당|리츠|주주환원|밸류업/ },
  { id: 'auto', name: '자동차', icon: Car, pattern: /자동차|현대차|모빌리티/ },
  { id: 'energy', name: '에너지·전력', icon: Zap, pattern: /원자력|전력|에너지|수소|태양광|신재생|ESS/ },
  { id: 'content', name: '콘텐츠·게임', icon: MonitorPlay, pattern: /게임|콘텐츠|미디어|웹툰|드라마|K-POP|엔터|소프트웨어|인터넷/ },
  { id: 'consumer', name: '소비·여행', icon: TrendingUp, pattern: /화장품|여행|레저|소비|K-푸드|생활소비/ },
  { id: 'industry', name: '산업재·인프라', icon: Building2, pattern: /건설|기계|철강|인프라|설비|산업재/ },
];

function getRate(etf, period) {
  return period === '1w' ? etf.rate1w : etf.rate1m;
}

function buildHotThemes(etfs, period) {
  return THEME_RULES.map(theme => {
    const members = etfs
      .filter(etf => theme.pattern.test(etf.name))
      .filter(etf => getRate(etf, period) != null)
      .sort((a, b) => getRate(b, period) - getRate(a, period));
    const leaders = members.slice(0, 3);
    const score = leaders.length
      ? leaders.reduce((sum, etf) => sum + getRate(etf, period), 0) / leaders.length
      : null;
    return { ...theme, members, score };
  })
    .filter(theme => theme.members.length > 0)
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
}

function ThemeEtfCard({ etf, period }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const rate = getRate(etf, period);

  useEffect(() => {
    let active = true;
    loadHoldings(etf.code)
      .then(data => active && setHoldings(data.slice(0, 5)))
      .catch(() => active && setHoldings([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [etf.code]);

  return (
    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-200 transition-colors space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <ETFIcon etf={etf} size="sm" />
          <div>
          <span className="text-xs font-mono text-slate-500">{etf.code}</span>
          <Link to={`/etf/${etf.code}`} className="font-bold text-slate-900 hover:text-blue-600 block">
            {etf.name}
          </Link>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm font-mono">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">기준일 종가</span>
            <span className="font-semibold text-slate-700">{etf.price.toLocaleString()}원</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">{period === '1w' ? '1주' : '1개월'} 수익률</span>
            <span className={`font-bold ${rate >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {rate >= 0 ? '+' : ''}{rate}%
            </span>
          </div>
        </div>
      </div>
      <div>
        <span className="text-[10px] text-slate-500 block mb-2 font-semibold">TOP 5 구성종목</span>
        {loading ? (
          <Loader2 className="animate-spin text-slate-600" size={14} />
        ) : holdings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {holdings.map(holding => (
              <span key={`${holding.code}-${holding.name}`} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                {holding.name} ({holding.value}%)
              </span>
            ))}
          </div>
        ) : <span className="text-xs text-slate-600">구성종목 데이터 없음</span>}
      </div>
    </div>
  );
}

export default function Theme() {
  const [period, setPeriod] = useState('1w');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const { etfs, loading, error } = useETFData(period);
  const themes = useMemo(() => buildHotThemes(etfs, period), [etfs, period]);
  const activeTheme = themes.find(theme => theme.id === selectedTheme) || themes[0];

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-950">
            <LayoutGrid className="text-emerald-600" /> 테마 핫 ETF
          </h1>
          <p className="text-slate-600 text-sm mt-2">국내 주식형 ETF를 산업 테마로 자동 분류하고, 상위 3개 ETF 평균 수익률로 정렬합니다.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          {PERIODS.map(item => (
            <button key={item.id} onClick={() => { setPeriod(item.id); setSelectedTheme(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === item.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 hover:text-slate-900'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-3xl p-20 flex items-center justify-center gap-3 text-slate-500 text-sm">
          <Loader2 className="animate-spin text-emerald-600" /> 테마 수익률 계산 중...
        </div>
      ) : error ? (
        <div className="glass rounded-3xl p-12 text-center text-rose-600 text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 px-1">수익률 상위 테마</h2>
            {themes.map((theme, index) => {
              const Icon = theme.icon;
              const selected = theme.id === activeTheme?.id;
              return (
                <button key={theme.id} onClick={() => setSelectedTheme(theme.id)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border transition-all ${selected ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 border-emerald-500/40' : 'glass hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-600 w-4">{index + 1}</span>
                    <div className={`p-2 rounded-xl ${selected ? 'bg-emerald-500 text-slate-950' : 'bg-white text-slate-600'}`}><Icon size={17} /></div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{theme.name}</div>
                      <div className="text-[11px] text-slate-500">{theme.members.length}개 ETF</div>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold ${theme.score >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                    {theme.score >= 0 ? '+' : ''}{theme.score.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-2 glass p-6 rounded-3xl space-y-5">
            {activeTheme && (
              <>
                <div>
                  <span className="text-xs font-semibold text-emerald-600">HOT THEME</span>
                  <h2 className="text-2xl font-extrabold text-slate-950 mt-1">{activeTheme.name} 대표 ETF</h2>
                  <p className="text-xs text-slate-600 mt-1">{period === '1w' ? '최근 1주' : '최근 1개월'} 수익률이 높은 순서입니다.</p>
                </div>
                <div className="space-y-4">
                  {activeTheme.members.slice(0, 5).map(etf => <ThemeEtfCard key={etf.code} etf={etf} period={period} />)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
