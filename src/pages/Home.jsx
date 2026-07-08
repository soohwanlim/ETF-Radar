import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarPlus, Check, ChevronDown, ChevronUp, Search, Star } from 'lucide-react';
import { useWatchlistStore } from '../store/watchlistStore';
import { useCompareStore } from '../store/compareStore';
import { useETFData } from '../hooks/useETFData';
import { useChanges } from '../hooks/useChanges';
import ETFIcon from '../components/ETFIcon';
import { loadChangesHistory, loadListings, loadThemeSignals } from '../data/staticData';

const PERIODS = [
  ['1d', '오늘'], ['1w', '1주'], ['1m', '1개월'], ['3m', '3개월'], ['1y', '1년'], ['10y', '10년'],
];
const COLLAPSED_ETF_COUNT = 30;
const ACTIVE_COMMON_SIGNAL_DAYS = 7;
const MARKET_PROXIES = [
  { code: '069500', label: 'KOSPI200', name: 'KODEX 200' },
  { code: '229200', label: 'KOSDAQ150', name: 'KODEX 코스닥150' },
];

function getRate(etf, period) {
  return etf?.[`rate${period}`] ?? null;
}

function isActiveEtf(etf) {
  return /액티브|Active/i.test(`${etf.name || ''} ${etf.description || ''}`);
}

function Rate({ value, large = false }) {
  if (value == null) return <span className="text-slate-500">-</span>;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center justify-end font-bold tabular-nums ${large ? 'text-xl' : 'text-sm'} ${positive ? 'text-red-600' : 'text-blue-600'}`}>
      <Icon size={large ? 19 : 15} />
      {positive ? '+' : ''}{value}%
    </span>
  );
}

function selectMainSignals(signals) {
  const selected = [];
  const themeCounts = new Map();
  const ranked = signals
    .filter(signal => signal.signalType === 'per_cu_quantity' && signal.direction === 'increase')
    .sort((a, b) => b.etfCount - a.etfCount
      || b.coverageRate - a.coverageRate
      || (b.averageShareChangeRate || 0) - (a.averageShareChangeRate || 0));

  for (const signal of ranked) {
    if ((themeCounts.get(signal.themeId) || 0) >= 2) continue;
    selected.push(signal);
    themeCounts.set(signal.themeId, (themeCounts.get(signal.themeId) || 0) + 1);
    if (selected.length === 3) break;
  }
  return selected;
}

function filterChangesByDays(changes, days) {
  const latestDate = changes[0]?.date;
  if (!latestDate) return [];
  const cutoff = new Date(`${latestDate}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  return changes.filter(change => change.date >= cutoffDate);
}

function buildActiveCommonSignals(etfs, changes) {
  const activeEtfs = new Map(etfs.filter(isActiveEtf).map(etf => [etf.code, etf]));
  const grouped = new Map();

  for (const change of filterChangesByDays(changes, ACTIVE_COMMON_SIGNAL_DAYS)) {
    if (change.classification !== 'quantity_increase' || !activeEtfs.has(change.code)) continue;
    const key = `${change.holdingCode || change.holdingName}-${change.holdingName}`;
    const group = grouped.get(key) || {
      holdingCode: change.holdingCode,
      holdingName: change.holdingName,
      latestDate: change.date,
      etfs: new Map(),
    };
    const previous = group.etfs.get(change.code);
    if (!previous || change.date >= previous.date) {
      group.etfs.set(change.code, {
        code: change.code,
        name: change.etfName || activeEtfs.get(change.code)?.name,
        shareChangeRate: change.shareChangeRate,
        date: change.date,
      });
    }
    group.latestDate = group.latestDate > change.date ? group.latestDate : change.date;
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .map(signal => {
      const signalEtfs = [...signal.etfs.values()]
        .sort((a, b) => (b.shareChangeRate ?? -Infinity) - (a.shareChangeRate ?? -Infinity));
      const rates = signalEtfs.map(etf => etf.shareChangeRate).filter(value => value != null);
      return {
        ...signal,
        etfs: signalEtfs,
        etfCount: signalEtfs.length,
        averageShareChangeRate: rates.length
          ? Number((rates.reduce((sum, value) => sum + value, 0) / rates.length).toFixed(2))
          : null,
      };
    })
    .filter(signal => signal.etfCount >= 2)
    .sort((a, b) => b.etfCount - a.etfCount
      || b.latestDate.localeCompare(a.latestDate)
      || (b.averageShareChangeRate ?? -Infinity) - (a.averageShareChangeRate ?? -Infinity))
    .slice(0, 3);
}
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [period, setPeriod] = useState('3m');
  const [search, setSearch] = useState(() => searchQuery);
  const isComposingSearch = useRef(false);
  const [showAllEtfs, setShowAllEtfs] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [themeSignals, setThemeSignals] = useState([]);
  const [activeSignalChanges, setActiveSignalChanges] = useState([]);
  const [listings, setListings] = useState({ recent: [], upcoming: [] });
  const { watchlist, toggleWatchlist } = useWatchlistStore();
  const { selectedEtfs, addEtf, removeEtf } = useCompareStore();
  const { etfs, loading: etfsLoading, error: etfsError } = useETFData(period);
  const { changes, loading: changesLoading } = useChanges();


  function updateSearchParams(value) {
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

  function handleSearchChange(value) {
    setSearch(value);
    setShowAllEtfs(false);
    if (!isComposingSearch.current) updateSearchParams(value);
  }

  function handleSearchCompositionEnd(event) {
    isComposingSearch.current = false;
    handleSearchChange(event.currentTarget.value);
  }

  const filteredEtfs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return etfs.filter(etf => {
      const keywordOk = !keyword || etf.name.toLowerCase().includes(keyword) || etf.code.includes(keyword);
      const activeOk = !activeOnly || isActiveEtf(etf);
      return keywordOk && activeOk;
    });
  }, [activeOnly, etfs, search]);
  const visibleEtfs = showAllEtfs ? filteredEtfs : filteredEtfs.slice(0, COLLAPSED_ETF_COUNT);
  const canToggleEtfs = filteredEtfs.length > COLLAPSED_ETF_COUNT;

  const leaders = etfs.slice(0, 3);
  const periodLabel = PERIODS.find(([key]) => key === period)?.[1];
  const asOf = etfs[0]?.asOf;
  const positiveCount = etfs.filter(etf => (getRate(etf, period) ?? -Infinity) > 0).length;
  const activeEtfCount = etfs.filter(isActiveEtf).length;
  const marketReturns = MARKET_PROXIES.map(proxy => ({
    ...proxy,
    rate: getRate(etfs.find(etf => etf.code === proxy.code), period),
  }));
  const fallbackRecentListings = useMemo(() => {
    if (!asOf) return [];
    const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
    return etfs
      .filter(etf => {
        if (!etf.listingDate) return false;
        const age = (asOfTime - Date.parse(`${etf.listingDate}T00:00:00Z`)) / 86400000;
        return age >= 0 && age <= 90;
      })
      .sort((a, b) => b.listingDate.localeCompare(a.listingDate))
      .slice(0, 4);
  }, [asOf, etfs]);
  const recentListings = listings.recent?.length ? listings.recent : fallbackRecentListings;
  const mainSignals = useMemo(() => selectMainSignals(themeSignals), [themeSignals]);
  const activeCommonSignals = useMemo(() => buildActiveCommonSignals(etfs, activeSignalChanges), [activeSignalChanges, etfs]);

  useEffect(() => {
    let active = true;
    loadThemeSignals().then(data => active && setThemeSignals(data)).catch(() => active && setThemeSignals([]));
    loadChangesHistory().then(data => active && setActiveSignalChanges(data)).catch(() => active && setActiveSignalChanges([]));
    loadListings().then(data => active && setListings(data)).catch(() => active && setListings({ recent: [], upcoming: [] }));
    return () => { active = false; };
  }, []);

  const toggleCompare = code => {
    if (selectedEtfs.includes(code)) removeEtf(code);
    else addEtf(code);
  };

  return (
    <div className="space-y-10 fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="space-y-4">
            <span className="inline-flex w-fit rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">국내 ETF 비교 레이더</span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">국내 ETF 비교와 구성종목 변화</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                수익률, 신규 상장 ETF, TOP 10 구성자산 변화, 액티브 ETF 공통 매수 신호를 매일 종가 기준 데이터로 비교합니다.
              </p>
            </div>
            {asOf && (
              <div className="space-y-1 text-xs font-semibold text-slate-500">
                <p>{asOf} 종가 기준 · 실시간 시세가 아닙니다</p>
                <p>다음 영업일 오전 9시 15분 전후 KRX API 기준으로 업데이트됩니다.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">감시 ETF</div>
              <div className="mt-1 text-xl font-extrabold text-slate-950">{etfs.length || '-'}</div>
            </div>
            <div className="rounded-2xl bg-red-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">상승 ETF</div>
              <div className="mt-1 text-xl font-extrabold text-red-600">{positiveCount || '-'}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="text-[11px] font-semibold text-slate-500">신규 상장</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700">{recentListings.length || '-'}</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{periodLabel} 수익률</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">지금 가장 많이 오른 ETF</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {marketReturns.map(proxy => (
              <div key={proxy.code} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm" title={`${proxy.name} 기준`}>
                <span className="font-semibold text-slate-500">{periodLabel} {proxy.label}</span>
                <span className={`ml-2 font-extrabold tabular-nums ${proxy.rate == null ? 'text-slate-500' : proxy.rate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {proxy.rate == null ? '-' : `${proxy.rate >= 0 ? '+' : ''}${proxy.rate}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {leaders.map((etf, index) => (
            <Link key={etf.code} to={`/etf/${etf.code}`} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-7 flex items-start justify-between">
                <div className="flex items-center gap-2"><ETFIcon etf={etf} /><span className="text-xs font-bold text-slate-400">#{index + 1}</span></div>
                <Rate value={getRate(etf, period)} large />
              </div>
              <h3 className="truncate font-bold text-slate-950 group-hover:text-blue-600">{etf.name}</h3>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{etf.code}</span>
                <span>{etf.asOf} 종가 {etf.price?.toLocaleString()}원</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="min-h-[1280px] space-y-10">
        {mainSignals.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">최근 30일 · 1CU당 구성수량 증가</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">여러 ETF가 함께 늘린 종목</h2>
            </div>
            <Link to="/changes?types=quantity_increase,quantity_decrease,quantity_decrease_weight_held" className="shrink-0 text-xs font-bold text-slate-500 hover:text-blue-600">전체 보기</Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
            {mainSignals.map(signal => {
              return (
                <Link
                  key={`${signal.themeId}-${signal.holdingCode}-${signal.direction}`}
                  to={`/theme?theme=${signal.themeId}`}
                  className="min-w-[270px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{signal.themeName}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">1CU 수량 증가</span>
                    </div>
                    <span className="rounded-full bg-red-50 p-2 text-red-600"><ArrowUpRight size={16} /></span>
                  </div>
                  <h3 className="mt-5 truncate text-lg font-extrabold text-slate-950">{signal.holdingName}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{signal.etfCount}개 ETF에서 1CU당 수량 증가</p>
                  <div className="mt-5 flex items-end justify-between text-xs text-slate-500">
                    <span>테마 ETF의 {signal.coverageRate}%</span>
                    {signal.averageShareChangeRate != null && (
                      <span className="font-bold text-red-600">평균 +{signal.averageShareChangeRate}%</span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-slate-400">비중 변화 평균 {signal.averageWeightDelta > 0 ? '+' : ''}{signal.averageWeightDelta}%p</div>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">메인에는 최근 30일 동안 여러 테마 ETF에서 1CU당 구성수량이 함께 증가한 신호만 표시합니다. 감소와 TOP 10 변화는 변경 감지에서 확인할 수 있습니다.</p>
        </section>
      )}

      {activeCommonSignals.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-600">최근 7일 · 많은 액티브 ETF에서 증가한 순</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">액티브 ETF가 함께 늘린 종목</h2>
            </div>
            <Link to="/active" className="shrink-0 text-xs font-bold text-slate-500 hover:text-red-600">전체 보기</Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
            {activeCommonSignals.map(signal => (
              <Link
                key={`${signal.holdingCode || signal.holdingName}-${signal.holdingName}`}
                to="/active"
                className="min-w-[270px] rounded-3xl border border-red-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-extrabold text-slate-950">{signal.holdingName}</h3>
                    <p className="mt-1 text-sm font-semibold text-red-700">{signal.etfCount}개 액티브 ETF에서 증가</p>
                  </div>
                  <span className="rounded-full bg-red-50 p-2 text-red-600"><ArrowUpRight size={16} /></span>
                </div>
                <div className="mt-5 flex items-end justify-between text-xs text-slate-500">
                  <span>{signal.latestDate} 기준</span>
                  {signal.averageShareChangeRate != null && (
                    <span className="font-bold text-red-600">평균 +{signal.averageShareChangeRate}%</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {signal.etfs.slice(0, 2).map(etf => (
                    <span key={etf.code} className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{etf.name}</span>
                  ))}
                  {signal.etfCount > 2 && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">+{signal.etfCount - 2}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">액티브 ETF만 대상으로 최근 7일간 1CU당 구성수량이 함께 증가한 종목을 요약합니다.</p>
        </section>
      )}
      {recentListings.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CalendarPlus size={16} /> 신규 상장</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">최근 시장에 들어온 ETF</h2>
              <p className="mt-0.5 text-xs text-slate-500">최근 90일 내 상장 · 네이버 상장일 기준</p>
            </div>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 sm:inline-flex">상장예정: 소스 확인 중</span>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
            {recentListings.map(etf => (
              <Link key={etf.code} to={`/etf/${etf.code}`} className="min-w-[240px] rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0">
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">{etf.listingDate} 상장</span>
                <div className="mt-4 flex items-center gap-3"><ETFIcon etf={etf} size="sm" /><h3 className="truncate font-bold text-slate-950">{etf.name}</h3></div>
                <p className="mt-1 truncate text-xs text-slate-500">{etf.provider || etf.code}</p>
                <div className="mt-5 flex items-end justify-between">
                  <span className="text-xs text-slate-500">{etf.asOf} 종가</span>
                  <span className="font-bold tabular-nums text-slate-900">{etf.price?.toLocaleString()}원</span>
                </div>
              </Link>
            ))}
            <div className="min-w-[240px] rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 md:min-w-0">
              <div className="font-bold text-slate-900">상장예정 ETF</div>
              <p className="mt-2 text-xs leading-relaxed">KRX 일별매매정보는 상장 후 데이터가 안정적입니다. 상장예정은 구조화 소스가 확인되면 별도 자동화로 연결합니다.</p>
            </div>
          </div>
        </section>
      )}

      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-blue-600">ETF Radar 활용 방법</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">국내 ETF를 수익률만이 아니라 구성 변화까지 함께 비교합니다</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            ETF Radar는 국내 주식형 현물 ETF의 종가 수익률, 신규 상장 ETF, TOP 10 구성자산 변화, 액티브 ETF의 공통 구성수량 증가 신호를 매일 같은 기준으로 정리합니다.
            ETF를 고를 때 단순히 오늘 많이 오른 상품만 보는 것이 아니라, 어떤 종목이 여러 ETF에서 함께 늘었는지와 최근 운용 방향에 변화가 있는지도 함께 확인할 수 있습니다.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-extrabold text-slate-950">수익률 비교</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              1일, 1주, 1개월, 3개월, 1년, 10년 수익률을 기준일 종가로 비교합니다. KOSPI200·KOSDAQ150 대표 ETF와의 차이도 함께 볼 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-extrabold text-slate-950">구성종목 변화 확인</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              네이버 금융 TOP 10 구성자산 스냅샷을 비교해 진입·이탈, 1CU당 구성수량 변화, 수량 감소에도 비중이 유지되는 경우를 구분합니다.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-extrabold text-slate-950">액티브 ETF 관찰</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              최근 7일 동안 여러 액티브 ETF가 함께 늘린 종목을 모아 보여줍니다. 운용사들의 공통 관심을 살피는 참고 신호로 활용할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
          <Link to="/guide" className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">데이터 해석 안내</Link>
          <Link to="/about" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">서비스 소개</Link>
          <Link to="/compare" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">ETF 비교하기</Link>
          <Link to="/insights" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">ETF 인사이트</Link>
          <Link to="/methodology" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">데이터 방법론</Link>
          <Link to="/faq" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">FAQ</Link>
        </div>
      </section>
      <section className="grid min-h-[1180px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">전체 ETF</h2>
              <span className="text-xs text-slate-500">{filteredEtfs.length}개</span>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {PERIODS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => { setPeriod(key); setShowAllEtfs(false); }} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${period === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950'}`}>
                  {label}
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input value={search} onCompositionStart={() => { isComposingSearch.current = true; }} onCompositionEnd={handleSearchCompositionEnd} onChange={event => handleSearchChange(event.target.value)} placeholder="ETF 이름이나 종목코드 검색" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2" />
            </label>

            <button
              type="button"
              onClick={() => { setActiveOnly(value => !value); setShowAllEtfs(false); }}
              className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${activeOnly ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}
            >
              액티브 ETF만 보기
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeOnly ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{activeEtfCount}개</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {etfsLoading ? (
              <div className="min-h-[980px] divide-y divide-slate-100">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-4 md:px-5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="hidden h-9 w-9 animate-pulse rounded-xl bg-slate-100 sm:block" />
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : etfsError ? (
              <div className="p-12 text-center text-sm text-red-600">데이터를 불러오지 못했습니다: {etfsError}</div>
            ) : filteredEtfs.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
            ) : (
              <>
                {visibleEtfs.map((etf, index) => {
                const isSelected = selectedEtfs.includes(etf.code);
                const isFavorite = watchlist.includes(etf.code);
                return (
                  <div key={etf.code} className={`flex items-center gap-3 px-4 py-4 md:px-5 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                    <ETFIcon etf={etf} size="sm" />
                    <Link to={`/etf/${etf.code}`} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-950 md:text-base">{etf.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{etf.code} · {etf.asOf} 종가 {etf.price?.toLocaleString()}원</div>
                    </Link>
                    <div className="w-20 text-right"><Rate value={getRate(etf, period)} /></div>
                    <button type="button" onClick={() => toggleWatchlist(etf.code)} className={`hidden rounded-xl p-2 sm:block ${isFavorite ? 'text-amber-600' : 'text-slate-600 hover:text-slate-700'}`} aria-label={`${etf.name} 즐겨찾기`}>
                      <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" onClick={() => toggleCompare(etf.code)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`} aria-label={`${etf.name} 비교 선택`}>
                      {isSelected ? <Check size={17} /> : <span className="text-lg leading-none">+</span>}
                    </button>
                  </div>
                );
                })}
                {canToggleEtfs && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllEtfs(value => !value)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {showAllEtfs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showAllEtfs ? '접기' : `전체 ${filteredEtfs.length}개 ETF 펼쳐보기`}
                    </button>
                    {!showAllEtfs && (
                      <p className="mt-2 text-xs text-slate-500">현재 수익률 상위 {visibleEtfs.length}개만 표시 중입니다.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">TOP 10 기준</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">최근 구성 변화</h2>
            </div>
            <Link to="/changes" className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label="변경사항 전체 보기"><ArrowRight size={17} /></Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {changesLoading ? (
              <div className="min-h-[360px] divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : changes.length > 0 ? changes.slice(0, 5).map((change, index) => (
              <Link key={`${change.code}-${index}`} to={`/etf/${change.code}`} className={`block p-4 transition-colors hover:bg-slate-100 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="truncate text-sm font-bold text-slate-900">{change.etfName}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${change.type === 'new' ? 'bg-emerald-500/10 text-emerald-600' : change.type === 'out' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>{change.badge}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{change.message}</p>
              </Link>
            )) : (
              <div className="p-8 text-center text-sm text-slate-500">최근 변경사항이 없습니다.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
