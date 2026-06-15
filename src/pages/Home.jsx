import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarPlus, Check, Loader2, Search, Star } from 'lucide-react';
import { useWatchlistStore } from '../store/watchlistStore';
import { useCompareStore } from '../store/compareStore';
import { useETFData } from '../hooks/useETFData';
import { useChanges } from '../hooks/useChanges';
import ETFIcon from '../components/ETFIcon';
import { loadThemeSignals } from '../data/staticData';

const PERIODS = [
  ['1d', '오늘'], ['1w', '1주'], ['1m', '1개월'], ['3m', '3개월'], ['1y', '1년'], ['10y', '10년'],
];

function getRate(etf, period) {
  return etf[`rate${period}`];
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
  const ranked = [...signals].sort((a, b) => {
    return b.etfCount - a.etfCount
      || b.coverageRate - a.coverageRate
      || Math.abs(b.averageShareChangeRate || 0) - Math.abs(a.averageShareChangeRate || 0);
  });

  for (const signal of ranked) {
    if ((themeCounts.get(signal.themeId) || 0) >= 2) continue;
    selected.push(signal);
    themeCounts.set(signal.themeId, (themeCounts.get(signal.themeId) || 0) + 1);
    if (selected.length === 3) break;
  }
  return selected;
}

export default function Home() {
  const [period, setPeriod] = useState('3m');
  const [search, setSearch] = useState('');
  const [themeSignals, setThemeSignals] = useState([]);
  const { watchlist, toggleWatchlist } = useWatchlistStore();
  const { selectedEtfs, addEtf, removeEtf } = useCompareStore();
  const { etfs, loading: etfsLoading, error: etfsError } = useETFData(period);
  const { changes, loading: changesLoading } = useChanges();

  const filteredEtfs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return etfs;
    return etfs.filter(etf => etf.name.toLowerCase().includes(keyword) || etf.code.includes(keyword));
  }, [etfs, search]);

  const leaders = etfs.slice(0, 3);
  const periodLabel = PERIODS.find(([key]) => key === period)?.[1];
  const asOf = etfs[0]?.asOf;
  const recentListings = useMemo(() => {
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
  const mainSignals = useMemo(() => selectMainSignals(themeSignals), [themeSignals]);

  useEffect(() => {
    let active = true;
    loadThemeSignals().then(data => active && setThemeSignals(data)).catch(() => active && setThemeSignals([]));
    return () => { active = false; };
  }, []);

  const toggleCompare = code => {
    if (selectedEtfs.includes(code)) removeEtf(code);
    else addEtf(code);
  };

  return (
    <div className="space-y-10 fade-in">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-blue-600">오늘의 ETF</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">어떤 ETF가 오르고 있을까요?</h1>
        <p className="text-sm leading-relaxed text-slate-600 md:text-base">국내 주식형 현물 ETF의 종가 수익률과 TOP 10 구성자산 변화를 비교합니다.</p>
        {asOf && <p className="pt-1 text-xs font-semibold text-slate-500">{asOf} 종가 기준 · 실시간 시세가 아닙니다</p>}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">{periodLabel} 수익률</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">지금 가장 많이 오른 ETF</h2>
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

      {mainSignals.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">1CU당 구성수량 신호</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">여러 ETF에서 수량이 함께 변한 종목</h2>
            </div>
            <Link to="/theme" className="shrink-0 text-xs font-bold text-slate-500 hover:text-blue-600">전체 보기</Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
            {mainSignals.map(signal => {
              const increase = signal.direction === 'increase';
              const Icon = increase ? ArrowUpRight : ArrowDownRight;
              return (
                <Link
                  key={`${signal.themeId}-${signal.holdingCode}-${signal.direction}`}
                  to={`/theme?theme=${signal.themeId}`}
                  className="min-w-[270px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{signal.themeName}</span>
                    <span className={`rounded-full p-2 ${increase ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Icon size={16} /></span>
                  </div>
                  <h3 className="mt-5 truncate text-lg font-extrabold text-slate-950">{signal.holdingName}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{signal.etfCount}개 ETF에서 1CU당 수량 {increase ? '증가' : '감소'}</p>
                  <div className="mt-5 flex items-end justify-between text-xs text-slate-500">
                    <span>테마 ETF의 {signal.coverageRate}%</span>
                    {signal.averageShareChangeRate != null && (
                      <span className={`font-bold ${increase ? 'text-red-600' : 'text-blue-600'}`}>평균 {signal.averageShareChangeRate > 0 ? '+' : ''}{signal.averageShareChangeRate}%</span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-slate-400">비중 변화 평균 {signal.averageWeightDelta > 0 ? '+' : ''}{signal.averageWeightDelta}%p</div>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">네이버 금융의 1CU당 TOP 10 구성수량 기준입니다. 기업행사나 CU 기준 변경 가능성이 있어 매매로 단정하지 않습니다.</p>
        </section>
      )}

      {recentListings.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarPlus size={19} className="text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-950">새로 상장한 ETF</h2>
              <p className="mt-0.5 text-xs text-slate-500">최근 90일 내 상장 · 상장일 기준</p>
            </div>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
            {recentListings.map(etf => (
              <Link key={etf.code} to={`/etf/${etf.code}`} className="min-w-[240px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0">
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">{etf.listingDate} 상장</span>
                <div className="mt-4 flex items-center gap-3"><ETFIcon etf={etf} size="sm" /><h3 className="truncate font-bold text-slate-950">{etf.name}</h3></div>
                <p className="mt-1 truncate text-xs text-slate-500">{etf.provider || etf.code}</p>
                <div className="mt-5 flex items-end justify-between">
                  <span className="text-xs text-slate-500">{etf.asOf} 종가</span>
                  <span className="font-bold tabular-nums text-slate-900">{etf.price?.toLocaleString()}원</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">전체 ETF</h2>
              <span className="text-xs text-slate-500">{filteredEtfs.length}개</span>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {PERIODS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setPeriod(key)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${period === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950'}`}>
                  {label}
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ETF 이름이나 종목코드 검색" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2" />
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {etfsLoading ? (
              <div className="flex h-52 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />ETF를 불러오는 중입니다.</div>
            ) : etfsError ? (
              <div className="p-12 text-center text-sm text-red-600">데이터를 불러오지 못했습니다: {etfsError}</div>
            ) : filteredEtfs.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>
            ) : (
              filteredEtfs.map((etf, index) => {
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
              })
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
              <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
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
