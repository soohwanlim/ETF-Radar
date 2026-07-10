import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, Cpu, BatteryCharging, Bot, Shield, Ship, HeartPulse, ArrowDownRight, ArrowUpRight,
  Landmark, Car, Zap, MonitorPlay, Building2, ChevronDown, Loader2, TrendingUp, BarChart3,
} from 'lucide-react';
import { useETFData } from '../hooks/useETFData';
import { loadHoldings, loadThemeSignals } from '../data/staticData';
import ETFIcon from '../components/ETFIcon';
import { THEME_RULES, themeMatchesEtf } from '../data/themeRules';

const PERIODS = [
  { id: '1w', label: '1주' },
  { id: '1m', label: '1개월' },
];

const THEME_ICONS = {
  semi: Cpu,
  valueup: TrendingUp,
  index: BarChart3,
  battery: BatteryCharging,
  'ai-robot': Bot,
  defense: Shield,
  ship: Ship,
  bio: HeartPulse,
  finance: Landmark,
  auto: Car,
  energy: Zap,
  content: MonitorPlay,
  consumer: TrendingUp,
  industry: Building2,
};

function getRate(etf, period) {
  return period === '1w' ? etf.rate1w : etf.rate1m;
}

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = event => setIsDesktop(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

function buildHotThemes(etfs, period) {
  return THEME_RULES.map(theme => {
    const members = etfs
      .filter(etf => themeMatchesEtf(theme, etf))
      .filter(etf => getRate(etf, period) != null)
      .sort((a, b) => getRate(b, period) - getRate(a, period));
    const leaders = members.slice(0, 3);
    const score = leaders.length
      ? leaders.reduce((sum, etf) => sum + getRate(etf, period), 0) / leaders.length
      : null;
    return { ...theme, icon: THEME_ICONS[theme.id] || LayoutGrid, members, score };
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

function ThemeSignalPanel({ signals, themeId }) {
  const themeSignals = signals.filter(signal => signal.themeId === themeId);
  const visibleSignals = themeSignals.slice(0, 5);
  if (themeSignals.length === 0) return null;

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900">공통 구성종목 변화</div>
        <div className="mt-1 text-xs text-slate-500">최근 30일 기준으로 1CU당 수량 변화와 TOP 10 진입·이탈/비중 변화를 구분해 표시합니다.</div>
      </div>
      <div className="space-y-2">
        {visibleSignals.map(signal => {
          const increase = signal.direction === 'increase';
          const quantitySignal = signal.signalType === 'per_cu_quantity';
          const Icon = increase ? ArrowUpRight : ArrowDownRight;
          return (
            <details key={`${signal.holdingCode}-${signal.direction}`} className="rounded-xl border border-blue-100 bg-white px-3 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded-full p-1.5 ${increase ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Icon size={15} /></span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{signal.holdingName}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-blue-600">{quantitySignal ? '1CU 수량 변화' : 'TOP 10·비중 변화'}</div>
                    <div className="text-[11px] text-slate-500">{signal.etfCount}개 ETF에서 {quantitySignal ? '1CU당 수량' : 'TOP 10 공통'} {increase ? '증가' : '감소'}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {quantitySignal && signal.averageShareChangeRate != null && (
                    <div className={`text-xs font-bold ${increase ? 'text-red-600' : 'text-blue-600'}`}>
                      평균 {signal.averageShareChangeRate > 0 ? '+' : ''}{signal.averageShareChangeRate}%
                    </div>
                  )}
                  {!quantitySignal && signal.averageWeightDelta != null && (
                    <div className={`text-xs font-bold ${increase ? 'text-red-600' : 'text-blue-600'}`}>
                      평균 {signal.averageWeightDelta > 0 ? '+' : ''}{signal.averageWeightDelta}%p
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">테마 ETF의 {signal.coverageRate}%</div>
                </div>
              </summary>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-2 text-[10px] font-semibold text-slate-500">
                  {quantitySignal ? '수량 변화 우선 · 비중 유지형 감소는 가격/비중 관리 가능성' : `TOP 10 진입 ${signal.newCount || 0} · 이탈 ${signal.outCount || 0}`}
                </div>
                <div className="space-y-1.5">
                  {signal.etfs.map(etf => (
                    <Link key={etf.code} to={`/etf/${etf.code}`} className="flex items-center justify-between gap-3 text-xs text-slate-600 hover:text-blue-600">
                      <span className="truncate">{etf.name}</span>
                      <span className="shrink-0 font-mono">
                        {quantitySignal
                          ? `${etf.shareChangeRate > 0 ? '+' : ''}${etf.shareChangeRate}%`
                          : `${etf.delta > 0 ? '+' : ''}${etf.delta}%p`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">TOP 10 이탈은 전체 편출을 뜻하지 않습니다. 수량 감소에도 비중이 유지되는 경우는 주가 상승이나 비중 관리 영향일 수 있지만, 매매 의도로 단정하지 않습니다.</p>
    </section>
  );
}

function ThemeEtfList({ theme, period }) {
  const [showAll, setShowAll] = useState(false);
  const visibleMembers = showAll ? theme.members : theme.members.slice(0, 5);
  const hiddenCount = theme.members.length - visibleMembers.length;

  return (
    <div className="space-y-4">
      {visibleMembers.map(etf => <ThemeEtfCard key={etf.code} etf={etf} period={period} />)}
      {theme.members.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(prev => !prev)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          {showAll ? '접기' : `남은 ${hiddenCount}개 ETF 더 보기`}
        </button>
      )}
    </div>
  );
}
export default function Theme() {
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState('1w');
  const [selectedTheme, setSelectedTheme] = useState(() => searchParams.get('theme'));
  const [signals, setSignals] = useState([]);
  const { etfs, loading, error } = useETFData(period);
  const isDesktop = useDesktopLayout();
  const themes = useMemo(() => buildHotThemes(etfs, period), [etfs, period]);
  const activeTheme = themes.find(theme => theme.id === selectedTheme)
    || (selectedTheme === '__closed__' && !isDesktop ? null : themes[0]);

  useEffect(() => {
    let active = true;
    loadThemeSignals().then(data => active && setSignals(data)).catch(() => active && setSignals([]));
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-950">
            <LayoutGrid className="text-emerald-600" /> 테마 핫 ETF
          </h1>
          <p className="text-slate-600 text-sm mt-2">국내 주식형 ETF를 ETF명 기반 테마로 자동 분류하고, 상위 3개 ETF 평균 수익률로 정렬합니다.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          {PERIODS.map(item => (
            <button key={item.id} onClick={() => { setPeriod(item.id); setSelectedTheme(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === item.id ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
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
        isDesktop ? <div className="grid grid-cols-3 gap-8">
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
                  <ThemeSignalPanel signals={signals} themeId={activeTheme.id} />
                  <ThemeEtfList theme={activeTheme} period={period} />
                </div>
              </>
            )}
          </div>
        </div> : <div className="space-y-3">
          <h2 className="px-1 text-lg font-bold text-slate-900">수익률 상위 테마</h2>
          {themes.map((theme, index) => {
            const Icon = theme.icon;
            const expanded = theme.id === activeTheme?.id;
            return (
              <section key={theme.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setSelectedTheme(expanded ? '__closed__' : theme.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs font-bold text-slate-400">{index + 1}</span>
                    <span className={`rounded-xl p-2 ${expanded ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}><Icon size={18} /></span>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">{theme.name}</div>
                      <div className="text-xs text-slate-500">{theme.members.length}개 ETF</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`font-mono text-sm font-bold ${theme.score >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                      {theme.score >= 0 ? '+' : ''}{theme.score.toFixed(2)}%
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-3">
                    <div className="px-1 pt-1 text-xs font-semibold text-slate-500">
                      {period === '1w' ? '최근 1주' : '최근 1개월'} 수익률 상위 ETF
                    </div>
                    <ThemeSignalPanel signals={signals} themeId={theme.id} />
                    <ThemeEtfList theme={theme} period={period} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
