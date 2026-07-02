import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, Layers3, Loader2, RefreshCw, Search } from 'lucide-react';
import ETFIcon from '../components/ETFIcon';
import { useETFData } from '../hooks/useETFData';
import { loadChangesHistory, loadLatestChanges } from '../data/staticData';
import { getEtfTheme } from '../data/themeRules';

const PERIODS = [
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '1y', label: '1년' },
];
const ACTIVE_COMMON_SIGNAL_DAYS = 7;
const ACTIVE_LIST_INITIAL_COUNT = 12;


function isActiveEtf(etf) {
  return /액티브|Active/i.test(`${etf.name || ''} ${etf.description || ''}`);
}

function getRate(etf, period) {
  return etf?.[`rate${period}`] ?? null;
}

function getTheme(etf) {
  return getEtfTheme(etf);
}

function formatRate(value) {
  if (value == null) return '-';
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function RateText({ value }) {
  if (value == null) return <span className="font-bold text-slate-500">-</span>;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center justify-end font-extrabold tabular-nums ${value >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
      <Icon size={15} />
      {formatRate(value)}
    </span>
  );
}

function classifyChange(change) {
  if (change.classification?.startsWith('quantity')) return '1CU 수량';
  if (change.type === 'new') return 'TOP 10 진입';
  if (change.type === 'out') return 'TOP 10 이탈';
  return '비중 변화';
}

function getChangeKind(change) {
  if (change.classification === 'quantity_increase') return 'quantity_increase';
  if (change.classification === 'quantity_decrease_weight_held') return 'quantity_decrease_weight_held';
  if (change.classification === 'quantity_decrease') return 'quantity_decrease';
  if (change.type === 'new') return 'top10_new';
  if (change.type === 'out') return 'top10_out';
  return 'price_effect';
}

const CHANGE_STYLE = {
  quantity_increase: {
    label: '1CU 수량 증가',
    className: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    valueClassName: 'text-red-600',
  },
  quantity_decrease: {
    label: '1CU 수량 감소',
    className: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100',
    valueClassName: 'text-blue-600',
  },
  quantity_decrease_weight_held: {
    label: '수량 감소 · 비중 유지',
    className: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    valueClassName: 'text-indigo-600',
  },
  top10_new: {
    label: 'TOP 10 진입',
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    valueClassName: 'text-emerald-600',
  },
  top10_out: {
    label: 'TOP 10 이탈',
    className: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
    valueClassName: 'text-rose-600',
  },
  price_effect: {
    label: '비중 변화',
    className: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    valueClassName: 'text-amber-600',
  },
};

function buildActiveRows(etfs, changes, period) {
  const decoratedEtfs = etfs.map(etf => ({ etf, theme: getTheme(etf), rate: getRate(etf, period) }));
  const themeGroups = new Map();
  const changesByCode = new Map();

  for (const item of decoratedEtfs) {
    if (item.rate == null) continue;
    const group = themeGroups.get(item.theme.id) || {
      sum: 0,
      members: [],
    };
    group.sum += item.rate;
    group.members.push(item);
    themeGroups.set(item.theme.id, group);
  }

  for (const group of themeGroups.values()) {
    group.members.sort((a, b) => b.rate - a.rate);
    group.average = Number((group.sum / group.members.length).toFixed(2));
    group.rankByCode = new Map(group.members.map((item, index) => [item.etf.code, index + 1]));
  }

  for (const change of changes) {
    if (!(change.classification?.startsWith('quantity') || change.type === 'new' || change.type === 'out')) continue;
    if (!changesByCode.has(change.code)) changesByCode.set(change.code, []);
    if (changesByCode.get(change.code).length < 4) changesByCode.get(change.code).push(change);
  }

  return decoratedEtfs
    .filter(item => isActiveEtf(item.etf))
    .map(({ etf, theme, rate }) => {
      const themeGroup = themeGroups.get(theme.id);
      const themeAverage = themeGroup?.average ?? null;
      const rank = rate == null ? null : themeGroup?.rankByCode.get(etf.code) ?? null;
      const recentChanges = changesByCode.get(etf.code) || [];

      return {
        etf,
        theme,
        rate,
        themeAverage,
        excess: rate != null && themeAverage != null ? Number((rate - themeAverage).toFixed(2)) : null,
        rank,
        peerCount: themeGroup?.members.length || 0,
        recentChanges,
      };
    })
    .sort((a, b) => (b.excess ?? -Infinity) - (a.excess ?? -Infinity));
}

function buildCommonActiveIncreases(rows, changes) {
  const activeMap = new Map(rows.map(row => [row.etf.code, row]));
  const grouped = new Map();

  for (const change of changes) {
    if (change.classification !== 'quantity_increase' || !activeMap.has(change.code)) continue;
    const key = `${change.holdingCode || change.holdingName}-${change.holdingName}`;
    const current = grouped.get(key) || {
      holdingCode: change.holdingCode,
      holdingName: change.holdingName,
      etfs: new Map(),
      shareRates: [],
      latestDate: change.date,
    };
    current.latestDate = current.latestDate > change.date ? current.latestDate : change.date;
    current.etfs.set(change.code, {
      code: change.code,
      name: change.etfName,
      themeName: activeMap.get(change.code)?.theme.name,
      shareChangeRate: change.shareChangeRate,
    });
    if (change.shareChangeRate != null) current.shareRates.push(change.shareChangeRate);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map(item => {
      const etfs = [...item.etfs.values()]
        .sort((a, b) => (b.shareChangeRate ?? -Infinity) - (a.shareChangeRate ?? -Infinity));
      return {
        ...item,
        etfs,
        etfCount: etfs.length,
        averageShareChangeRate: item.shareRates.length
          ? Number((item.shareRates.reduce((sum, value) => sum + value, 0) / item.shareRates.length).toFixed(2))
          : null,
      };
    })
    .filter(item => item.etfCount >= 2);
}

function getCommonSignalKey(signal) {
  return `${signal.holdingCode || signal.holdingName}-${signal.holdingName}`;
}

function sortSignalsByCount(signals) {
  return [...signals]
    .sort((a, b) => b.etfCount - a.etfCount || (b.averageShareChangeRate ?? -Infinity) - (a.averageShareChangeRate ?? -Infinity));
}

function sortSignalsByAverage(signals) {
  return [...signals]
    .sort((a, b) => (b.averageShareChangeRate ?? -Infinity) - (a.averageShareChangeRate ?? -Infinity) || b.etfCount - a.etfCount);
}

function filterChangesByDays(changes, days) {
  const latestDate = changes[0]?.date;
  if (!latestDate) return [];
  const cutoff = new Date(`${latestDate}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  return changes.filter(change => change.date >= cutoffDate);
}

export default function Active() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [period, setPeriod] = useState('3m');
  const [themeId, setThemeId] = useState('all');
  const search = searchQuery;
  const [expandedSignalKey, setExpandedSignalKey] = useState(null);
  const [expandedSignalSections, setExpandedSignalSections] = useState(() => new Set());
  const [showAllActiveRows, setShowAllActiveRows] = useState(false);
  const [changes, setChanges] = useState([]);
  const [changesLoading, setChangesLoading] = useState(true);
  const { etfs, loading, error } = useETFData(period);


  function handleSearchChange(value) {
    setShowAllActiveRows(false);
    setSearchParams(currentParams => {
      const nextParams = new URLSearchParams(currentParams);
      const nextValue = value.trim();
      if (nextValue) {
        nextParams.set('q', nextValue);
      } else {
        nextParams.delete('q');
      }
      return nextParams;
    }, { replace: true });
  }

  useEffect(() => {
    let alive = true;
    Promise.all([loadLatestChanges(), loadChangesHistory()])
      .then(([latest, history]) => {
        if (!alive) return;
        const seen = new Set();
        const merged = [...latest, ...history]
          .filter(change => {
            const key = `${change.date}-${change.code}-${change.type}-${change.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        setChanges(merged);
      })
      .catch(() => alive && setChanges([]))
      .finally(() => alive && setChangesLoading(false));
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => buildActiveRows(etfs, changes, period), [changes, etfs, period]);
  const activeThemes = useMemo(() => {
    const counts = new Map();
    for (const row of rows) counts.set(row.theme.id, { ...row.theme, count: (counts.get(row.theme.id)?.count || 0) + 1 });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
  }, [rows]);
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter(row => {
      const themeOk = themeId === 'all' || row.theme.id === themeId;
      const keywordOk = !keyword || row.etf.name.toLowerCase().includes(keyword) || row.etf.code.includes(keyword);
      return themeOk && keywordOk;
    });
  }, [rows, search, themeId]);
  const visibleFilteredRows = showAllActiveRows ? filteredRows : filteredRows.slice(0, ACTIVE_LIST_INITIAL_COUNT);
  //const hiddenActiveRowCount = filteredRows.length - visibleFilteredRows.length;
  const outperformCount = rows.filter(row => row.excess != null && row.excess > 0).length;
  const recentCommonSignalChanges = useMemo(() => filterChangesByDays(changes, ACTIVE_COMMON_SIGNAL_DAYS), [changes]);
  const commonIncreases = useMemo(() => buildCommonActiveIncreases(rows, recentCommonSignalChanges), [recentCommonSignalChanges, rows]);
  const commonIncreasesByCount = useMemo(() => sortSignalsByCount(commonIncreases), [commonIncreases]);
  const commonIncreasesByAverage = useMemo(() => sortSignalsByAverage(commonIncreases), [commonIncreases]);

  const toggleSignalSection = sectionId => {
    setExpandedSignalSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const renderSignalSection = (sectionId, title, signals) => {
    const isExpanded = expandedSignalSections.has(sectionId);
    const visibleSignals = isExpanded ? signals : signals.slice(0, 4);
    const hiddenCount = signals.length - visibleSignals.length;
    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-xs font-extrabold text-slate-700">{title}</div>
          {signals.length > 4 && (
            <button
              type="button"
              onClick={() => toggleSignalSection(sectionId)}
              className="shrink-0 text-xs font-bold text-slate-500 hover:text-red-600"
            >
              {isExpanded ? '접기' : `전체 ${signals.length}개 보기`}
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleSignals.map(signal => renderCommonSignalCard(signal, sectionId))}
        </div>
        {!isExpanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => toggleSignalSection(sectionId)}
            className="mt-3 w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            남은 {hiddenCount}개 더 보기
          </button>
        )}
      </div>
    );
  };
  const renderCommonSignalCard = (signal, sectionId) => {
    const signalKey = `${sectionId}-${getCommonSignalKey(signal)}`;
    const isExpanded = expandedSignalKey === signalKey;
    return (
      <div key={signalKey} className="rounded-2xl border border-red-100 bg-red-50 p-4">
        <button
          type="button"
          onClick={() => setExpandedSignalKey(isExpanded ? null : signalKey)}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={isExpanded}
        >
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-slate-950">{signal.holdingName}</h3>
            <p className="mt-1 text-xs font-semibold text-red-700">{signal.etfCount}개 액티브 ETF에서 증가</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {signal.averageShareChangeRate != null && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-red-600">
                평균 +{signal.averageShareChangeRate}%
              </span>
            )}
            <ChevronDown
              size={17}
              className={`text-red-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
        {isExpanded && (
          <div className="mt-4 space-y-1.5">
            {signal.etfs.map(etf => (
              <Link key={etf.code} to={`/etf/${etf.code}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs hover:text-blue-600">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-700">{etf.name}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{etf.themeName}</span>
                </span>
                <span className="shrink-0 font-bold text-red-600">+{etf.shareChangeRate}%</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950">
            <Activity className="text-blue-600" /> 액티브 ETF
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            액티브 ETF를 비슷한 테마 ETF와 비교하고, 최근 TOP 10 구성자산의 1CU당 수량 변화를 함께 봅니다.
          </p>
        </div>
        <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1">
          {PERIODS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${period === item.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Layers3 size={15} /> 액티브 ETF</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-950">{rows.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><BarChart3 size={15} /> 테마 평균 초과</div>
          <div className="mt-2 text-3xl font-extrabold text-red-600">{outperformCount}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><RefreshCw size={15} /> 구성 변화 감지</div>
          <div className="mt-2 text-3xl font-extrabold text-blue-600">{rows.filter(row => row.recentChanges.length > 0).length}</div>
        </div>
      </section>

      {commonIncreases.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-red-600">액티브 공통 매수 신호</p>
              <h2 className="text-xl font-extrabold text-slate-950">여러 액티브 ETF가 함께 늘린 종목</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">최근 {ACTIVE_COMMON_SIGNAL_DAYS}일 · 1CU당 구성수량 증가 기준</span>
          </div>
          <div className="space-y-5">
            {renderSignalSection('count', '많은 액티브 ETF에서 증가한 순', commonIncreasesByCount)}
            {renderSignalSection('average', '평균 증가율 높은 순', commonIncreasesByAverage)}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setThemeId('all')}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${themeId === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
            >
              전체
            </button>
            {activeThemes.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeId(theme.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${themeId === theme.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
              >
                {theme.name} {theme.count}
              </button>
            ))}
          </div>
          <label className="relative block lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              value={search}
              onChange={event => handleSearchChange(event.target.value)}
              placeholder="액티브 ETF 검색"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none ring-blue-500 focus:bg-white focus:ring-2"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />액티브 ETF 계산 중...</div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-red-600">데이터를 불러오지 못했습니다: {error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">조건에 맞는 액티브 ETF가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {visibleFilteredRows.map(row => (
              <article key={row.etf.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <ETFIcon etf={row.etf} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/etf/${row.etf.code}`} className="block truncate font-extrabold text-slate-950 hover:text-blue-600">{row.etf.name}</Link>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                          <span>{row.etf.code}</span>
                          <span>{row.theme.name}</span>
                          <span>{row.etf.provider}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-right lg:w-[360px]">
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-bold text-slate-500">{PERIODS.find(item => item.id === period)?.label} 수익률</div>
                      <div className="mt-1 text-sm"><RateText value={row.rate} /></div>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-bold text-slate-500">테마 평균 대비</div>
                      <div className={`mt-1 text-sm font-extrabold tabular-nums ${row.excess == null ? 'text-slate-500' : row.excess >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {row.excess == null ? '-' : `${row.excess >= 0 ? '+' : ''}${row.excess}%p`}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-bold text-slate-500">테마 내 수익률 순위</div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">{row.rank ? `${row.rank}/${row.peerCount}` : '-'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-[11px] font-bold text-slate-500">최근 구성 변화</div>
                  {changesLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={13} />변경 내역 확인 중...</div>
                  ) : row.recentChanges.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {row.recentChanges.map(change => {
                        const kind = getChangeKind(change);
                        const style = CHANGE_STYLE[kind] || CHANGE_STYLE.price_effect;
                        return (
                        <Link key={`${change.date}-${change.message}`} to={`/changes?types=${change.classification || kind}`} className={`rounded-xl border px-3 py-2 text-xs ${style.className}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`font-bold ${style.valueClassName}`}>{style.label || classifyChange(change)}</span>
                            <span className="font-mono text-slate-400">{change.date}</span>
                          </div>
                          <p className="line-clamp-2 text-slate-600">{change.message}</p>
                        </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">최근 감지된 TOP 10/1CU 변화가 없습니다.</div>
                  )}
                </div>
              </article>
            ))}
            {filteredRows.length > ACTIVE_LIST_INITIAL_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllActiveRows(prev => !prev)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {showAllActiveRows ? '접기' : `전체 ${filteredRows.length}개 ETF 펼쳐보기`}
              </button>
            )}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-slate-500">
        테마 비교는 ETF명 키워드 기반 자동 분류입니다. TOP 10 구성자산 변화는 전체 편입/편출이 아니라 네이버 금융 상위 10개 스냅샷 기준 변화입니다.
      </p>
    </div>
  );
}
