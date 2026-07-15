import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BarChart3, Layers3, Search, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { loadChangesHistory, loadEtfs, loadHoldingDetail, loadHoldingIndex } from '../data/staticData';
import ETFIcon from '../components/ETFIcon';
import { getEtfTheme } from '../data/themeRules';
import { useWatchlistStore } from '../store/watchlistStore';

const THEME_CHANGE_LOOKBACK_DAYS = 30;

const CHANGE_LABELS = {
  new: { label: 'TOP 10 진입', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: TrendingUp },
  out: { label: 'TOP 10 이탈', tone: 'text-rose-700 bg-rose-50 border-rose-100', icon: TrendingDown },
  weight: { label: '비중/수량 변화', tone: 'text-blue-700 bg-blue-50 border-blue-100', icon: BarChart3 },
};

function formatPercent(value) {
  if (value == null) return '-';
  return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
}

function formatWeight(value) {
  if (value == null) return '-';
  return `${Number(value).toFixed(2)}%`;
}

function isActiveEtf(etf) {
  return /액티브|Active/i.test(`${etf?.name || ''} ${etf?.description || ''}`);
}
function getChangeLabel(change) {
  if (change.type === 'weight') {
    if (change.classification === 'quantity_increase') return '1CU 수량 증가';
    if (change.classification === 'quantity_decrease_weight_held') return '수량 감소 · 비중 유지';
    if (change.classification === 'quantity_decrease') return '1CU 수량 감소';
    if (change.classification === 'price_effect') return '수량 유지 · 비중 변화';
  }
  return CHANGE_LABELS[change.type]?.label || '변화';
}
function getChangeDirection(change) {
  if (change.type === 'new') return 'entry';
  if (change.type === 'out') return 'exit';
  if (change.classification === 'quantity_increase') return 'increase';
  if (change.classification === 'quantity_decrease' || change.classification === 'quantity_decrease_weight_held') return 'decrease';
  return 'neutral';
}

function filterRecentChanges(changes, days = THEME_CHANGE_LOOKBACK_DAYS) {
  const latestDate = changes.reduce((latest, change) => (change.date > latest ? change.date : latest), '');
  const cutoffDate = latestDate ? new Date(`${latestDate}T00:00:00`) : null;
  if (cutoffDate) cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
  const cutoffKey = cutoffDate ? cutoffDate.toISOString().slice(0, 10) : '';
  return cutoffKey ? changes.filter(change => change.date >= cutoffKey) : changes;
}
function DivergingCountBar({ negative, positive, max, rounded = false }) {
  const scaleMax = Math.max(max, negative, positive, 1);
  const negativeRate = (negative / scaleMax) * 100;
  const positiveRate = (positive / scaleMax) * 100;
  const leftRadius = rounded ? 'rounded-l-full' : '';
  const rightRadius = rounded ? 'rounded-r-full' : '';

  return (
    <div className="relative grid h-2.5 grid-cols-2 gap-1">
      <div className={`relative overflow-hidden ${leftRadius}`}>
        <div className={`absolute right-0 top-0 h-full bg-blue-500 ${leftRadius}`} style={{ width: `${negativeRate}%` }} />
      </div>
      <div className={`relative overflow-hidden ${rightRadius}`}>
        <div className={`absolute left-0 top-0 h-full bg-red-500 ${rightRadius}`} style={{ width: `${positiveRate}%` }} />
      </div>
    </div>
  );
}
function buildChangeSummary(changes, etfByCode, filter = () => true) {
  const targetChanges = changes.filter(change => filter(etfByCode.get(change.code), change));
  const counts = targetChanges.reduce((acc, change) => {
    const direction = getChangeDirection(change);
    if (direction === 'increase' || direction === 'entry') acc.positive += 1;
    else if (direction === 'decrease' || direction === 'exit') acc.negative += 1;
    else acc.neutral += 1;
    acc.total += 1;
    if (change.code) acc.etfs.add(change.code);
    return acc;
  }, { positive: 0, negative: 0, neutral: 0, total: 0, etfs: new Set() });

  return {
    positive: counts.positive,
    negative: counts.negative,
    neutral: counts.neutral,
    total: counts.total,
    etfCount: counts.etfs.size,
    score: counts.positive - counts.negative,
  };
}
function buildThemeChangeSummaries(changes, holding, etfsByCode) {
  const currentThemeByEtf = new Map((holding?.etfs || []).map(etf => [
    etf.code,
    { id: etf.themeId || 'etc', name: etf.themeName || '전략·기타' },
  ]));
  const grouped = new Map();

  const recentChanges = filterRecentChanges(changes);


  for (const change of recentChanges) {
    let theme = currentThemeByEtf.get(change.code);
    if (!theme) {
      const etf = etfsByCode.get(change.code);
      theme = etf ? getEtfTheme(etf) : { id: 'etc', name: '전략·기타' };
    }

    if (theme.id === 'etc') continue;

    const current = grouped.get(theme.id) || {
      id: theme.id,
      name: theme.name,
      total: 0,
      increase: 0,
      decrease: 0,
      entry: 0,
      exit: 0,
      neutral: 0,
      latestDate: '',
      etfs: new Set(),
    };

    const direction = getChangeDirection(change);
    current[direction] += 1;
    current.total += 1;
    current.latestDate = current.latestDate > change.date ? current.latestDate : change.date;
    if (change.code) current.etfs.add(change.code);
    grouped.set(theme.id, current);
  }

  return [...grouped.values()]
    .map(item => {
      const positive = item.increase + item.entry;
      const negative = item.decrease + item.exit;
      const directionalTotal = positive + negative || 1;
      return {
        ...item,
        etfCount: item.etfs.size,
        positive,
        negative,
        positiveRate: Math.round((positive / directionalTotal) * 100),
        negativeRate: Math.round((negative / directionalTotal) * 100),
        score: positive - negative,
      };
    })
    .sort((a, b) => b.total - a.total || Math.abs(b.score) - Math.abs(a.score) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 4);
}

export default function HoldingDetail() {
  const { code } = useParams();
  const { toggleHoldingWatchlist, isHoldingWatched } = useWatchlistStore();
  const [holding, setHolding] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [etfsByCode, setEtfsByCode] = useState(new Map());
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const holdingWatched = isHoldingWatched(code);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadHoldingDetail(code),
      loadChangesHistory(),
      loadHoldingIndex(),
      loadEtfs(),
    ])
      .then(([detail, history, index, etfs]) => {
        if (!active) return;
        setError('');
        setHolding(detail);
        setChanges(filterRecentChanges(history.filter(change => change.holdingCode === code)).slice(0, 80));
        setSuggestions((index.items || []).slice(0, 8));
        setEtfsByCode(new Map(etfs.map(etf => [etf.code, etf])));
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || '구성종목 데이터를 불러오지 못했습니다.');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [code]);

  const classifiedThemes = useMemo(() => (holding?.themes || []).filter(theme => theme.id !== 'etc'), [holding]);
  const topThemes = useMemo(() => classifiedThemes.slice(0, 6), [classifiedThemes]);
  const activeEtfs = useMemo(() => (holding?.etfs || []).filter(etf => etf.active), [holding]);
  const themeChangeSummaries = useMemo(() => buildThemeChangeSummaries(changes, holding, etfsByCode), [changes, etfsByCode, holding]);
  const maxThemeDirectionalCount = useMemo(() => Math.max(...themeChangeSummaries.flatMap(theme => [theme.positive, theme.negative]), 1), [themeChangeSummaries]);
  const changeEtfByCode = useMemo(() => {
    const map = new Map();
    etfsByCode.forEach((etf, etfCode) => {
      const theme = getEtfTheme(etf);
      map.set(etfCode, {
        ...etf,
        themeId: theme.id,
        themeName: theme.name,
        active: isActiveEtf(etf),
      });
    });
    for (const etf of holding?.etfs || []) {
      map.set(etf.code, { ...(map.get(etf.code) || {}), ...etf });
    }
    return map;
  }, [etfsByCode, holding]);
  const changeSummary = useMemo(() => ({
    all: buildChangeSummary(changes, changeEtfByCode),
    nonIndex: buildChangeSummary(changes, changeEtfByCode, etf => etf && etf.themeId !== 'index'),
    active: buildChangeSummary(changes, changeEtfByCode, etf => etf?.active),
  }), [changes, changeEtfByCode]);
  const summaryGroups = useMemo(() => [
    { key: 'all', title: '전체', description: '지수·테마·액티브 포함', summary: changeSummary.all },
    { key: 'nonIndex', title: '지수 제외', description: '지수 추종 ETF 제외', summary: changeSummary.nonIndex },
    { key: 'active', title: '액티브 ETF', description: '액티브 운용 ETF 기준', summary: changeSummary.active },
  ], [changeSummary]);
  const maxSummaryDirectionalCount = useMemo(() => Math.max(...summaryGroups.flatMap(group => [group.summary.positive, group.summary.negative]), 1), [summaryGroups]);


  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !holding) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Search className="mx-auto text-slate-400" size={34} />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">구성종목을 찾지 못했습니다</h1>
        <p className="mt-2 text-sm text-slate-500">
          현재 네이버 금융 TOP 10 스냅샷에 포함된 종목만 역검색할 수 있습니다.
        </p>
        {suggestions.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 5).map(item => (
              <Link key={item.code} to={`/holding/${item.code}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                {item.name}
              </Link>
            ))}
          </div>
        )}
        <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">
          <ArrowLeft size={16} /> 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
          <ArrowLeft size={15} /> 검색으로 돌아가기
        </Link>
        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">{holding.code}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">{holding.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              이 종목을 TOP 10 구성자산으로 보유한 국내 주식형 현물 ETF를 역검색합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleHoldingWatchlist(holding.code)}
            className={`inline-flex items-center gap-2 self-start rounded-3xl border px-4 py-3 text-xs font-bold transition-all md:self-auto ${holdingWatched ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'}`}
            aria-pressed={holdingWatched}
          >
            <Star size={15} fill={holdingWatched ? 'currentColor' : 'none'} />
            {holdingWatched ? '종목 즐겨찾기 저장됨' : '종목 즐겨찾기'}
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
            {holding.asOf ? `기준일 ${holding.asOf} · 네이버 금융 TOP 10 기준` : '네이버 금융 TOP 10 기준'}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">보유 ETF</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{holding.etfCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">액티브 ETF</p>
          <p className="mt-2 text-3xl font-extrabold text-red-600">{holding.activeEtfCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">관련 테마</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-600">{classifiedThemes.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">최근 변화</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{changes.length}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">최근 1개월 TOP 10 변화 요약</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">TOP 10 변화 흐름을 나눠봅니다</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">네이버 금융 TOP 10 기준</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {summaryGroups.map(group => {
            const { summary } = group;
            const summaryTrendLabel = summary.score > 0 ? '증가 우세' : summary.score < 0 ? '감소 우세' : '혼조';
            const summaryTrendTone = summary.score > 0
              ? 'bg-red-50 text-red-600'
              : summary.score < 0
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-100 text-slate-500';
            return (
              <div key={group.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950">{group.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{group.description}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{summary.etfCount}개 ETF</span>
                </div>

                <div className="mt-4">
                  <DivergingCountBar negative={summary.negative} positive={summary.positive} max={maxSummaryDirectionalCount} rounded />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-extrabold">
                    <span className="text-blue-600">감소·이탈 {summary.negative}</span>
                    <span className="text-red-600">증가·진입 {summary.positive}</span>
                    {summary.neutral > 0 && <span className="text-slate-500">기타 {summary.neutral}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400">총 {summary.total}건</span>
                    <span className={`rounded-full px-2 py-0.5 font-extrabold ${summaryTrendTone}`}>{summaryTrendLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium leading-relaxed text-slate-500">
          지수 ETF는 시가총액·지수 추종 영향이 클 수 있어 별도로 분리했습니다. 표시값은 투자 판단이 아닌 TOP 10 구성 변화 감지 결과입니다.
        </p>
      </section>
      {themeChangeSummaries.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold text-violet-600">최근 1개월 테마별 움직임</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">어느 테마 ETF가 담고 있나</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">TOP 10 변화 기준</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60">
            {themeChangeSummaries.map(theme => {
              const trendLabel = theme.score > 0 ? '증가 우세' : theme.score < 0 ? '감소 우세' : '혼조';
              const trendTone = theme.score > 0
                ? 'bg-red-50 text-red-600'
                : theme.score < 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-500';
              return (
                <div key={theme.id} className="grid gap-3 bg-white/70 p-4 sm:grid-cols-[150px,170px,1fr,82px] sm:items-center">
                  <div className="min-w-0">
                    <Link to={`/theme?theme=${encodeURIComponent(theme.id)}`} className="group inline-flex max-w-full items-center gap-1 text-base font-extrabold text-slate-950 hover:text-emerald-700">
                      <span className="truncate">{theme.name}</span>
                      <ArrowUpRight size={14} className="shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600" />
                    </Link>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{theme.etfCount}개 ETF · {theme.total}건</p>
                  </div>

                  <p className="text-xs font-extrabold text-slate-500 tabular-nums sm:whitespace-nowrap">
                    <span className="text-blue-600">감소·이탈 {theme.negative}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-red-600">증가·진입 {theme.positive}</span>
                    {theme.neutral > 0 && (
                      <>
                        <span className="mx-1 text-slate-300">/</span>
                        <span>기타 {theme.neutral}</span>
                      </>
                    )}
                  </p>

                  <div className="min-w-0">
                    <DivergingCountBar negative={theme.negative} positive={theme.positive} max={maxThemeDirectionalCount} />
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${trendTone}`}>{trendLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-violet-600">최근 1개월 변경 이력</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">이 종목의 TOP 10 변화</h2>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">증가·진입 {changeSummary.all.positive}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">감소·이탈 {changeSummary.all.negative}</span>
              </div>
            </div>
            {changes.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                ETF Radar가 변경 이력을 수집하기 시작한 이후 이 종목의 TOP 10 변화가 아직 없습니다.
              </div>
            ) : (
              <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {changes.map((change, index) => {
                  const config = CHANGE_LABELS[change.type] || CHANGE_LABELS.weight;
                  const Icon = config.icon;
                  return (
                    <Link key={`${change.code}-${change.date}-${change.type}-${index}`} to={`/etf/${change.code}`} className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-4 hover:border-blue-200 hover:bg-blue-50/50">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${config.tone}`}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <span className="text-xs font-extrabold text-slate-500">{change.date}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${config.tone}`}>{getChangeLabel(change)}</span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-950">{change.etfName}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{change.message}</p>
                          {change.shareChangeRate != null && (
                            <p className={`mt-2 text-xs font-extrabold tabular-nums ${change.shareChangeRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              1CU 수량 {formatPercent(change.shareChangeRate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-600">현재 편입 현황</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">TOP 10에 포함한 ETF</h2>
              </div>
              <Layers3 className="text-blue-600" size={22} />
            </div>
            <div className="divide-y divide-slate-100">
              {holding.etfs.map(etf => (
                <Link key={etf.code} to={`/etf/${etf.code}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <ETFIcon etf={etf} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-slate-950">{etf.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{etf.themeName}</span>
                      {etf.active && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">액티브</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold tabular-nums text-slate-950">{formatWeight(etf.weight)}</div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-400">{etf.asOf}</div>
                  </div>
                  <ArrowUpRight className="hidden text-slate-400 sm:block" size={17} />
                </Link>
              ))}
            </div>
          </div>

        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-blue-600">테마 분포</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-950">어떤 테마 ETF가 담고 있나</h2>
            <div className="mt-4 space-y-3">
              {topThemes.map(theme => (
                <div key={theme.id}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{theme.name}</span>
                    <span className="text-blue-600">{theme.count}개</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, (theme.count / holding.etfCount) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-red-600">액티브 관찰</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-950">액티브 ETF 편입</h2>
            {activeEtfs.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">현재 TOP 10 기준 액티브 ETF 편입은 없습니다.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {activeEtfs.slice(0, 8).map(etf => (
                  <Link key={etf.code} to={`/etf/${etf.code}`} className="block rounded-2xl bg-red-50/70 px-3 py-2 hover:bg-red-50">
                    <div className="truncate text-xs font-extrabold text-slate-950">{etf.name}</div>
                    <div className="mt-1 text-[11px] font-bold text-red-600">비중 {formatWeight(etf.weight)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-950">데이터 기준</h2>
            <p className="mt-3">
              구성종목 역검색은 네이버 금융의 ETF별 TOP 10 구성자산 스냅샷을 뒤집어 만든 화면입니다.
              전체 보유 종목, 실시간 편입/편출, 투자 추천을 의미하지 않습니다.
            </p>
            <p className="mt-2">
              변경 이력은 ETF Radar가 구성종목 수집을 시작한 2026년 6월 이후 데이터에 한해 표시됩니다.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
