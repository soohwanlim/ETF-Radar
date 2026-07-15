import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Loader2, Star } from 'lucide-react';
import { useETFData } from '../hooks/useETFData';
import { useCompareStore } from '../store/compareStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { loadHoldingIndex } from '../data/staticData';
import ETFIcon from '../components/ETFIcon';

const PERIODS = [
  { id: '1d', label: '당일' },
  { id: '1w', label: '1주' },
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '1y', label: '1년' },
  { id: '10y', label: '10년' },
];

function useNoIndexPage() {
  useEffect(() => {
    const previous = document.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, follow');
    return () => {
      robots.setAttribute('content', previous);
    };
  }, []);
}

function HoldingWatchlistSection() {
  const { holdingWatchlist, toggleHoldingWatchlist } = useWatchlistStore();
  const [holdings, setHoldings] = useState([]);

  useEffect(() => {
    if (holdingWatchlist.length === 0) return;

    let active = true;
    loadHoldingIndex()
      .then(index => {
        if (!active) return;
        const itemByCode = new Map((index.items || []).map(item => [item.code, item]));
        setHoldings(holdingWatchlist.map(code => itemByCode.get(code)).filter(Boolean));
      })
      .catch(() => {
        if (active) setHoldings([]);
      });

    return () => {
      active = false;
    };
  }, [holdingWatchlist]);

  if (holdingWatchlist.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-950">즐겨찾기 종목</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          종목 역검색 상세 화면에서 별표를 누르면 삼성전자, SK하이닉스 같은 구성종목을 이곳에 저장하고 바로 다시 볼 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">즐겨찾기 종목</h2>
          <p className="mt-1 text-sm text-slate-500">저장한 구성종목의 역검색 상세 페이지로 바로 이동합니다.</p>
        </div>
        <span className="w-fit rounded-full border border-blue-500/20 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
          {holdingWatchlist.length}개 저장됨
        </span>
      </div>

      {holdings.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {holdings.map(item => (
            <div key={item.code} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/holding/${item.code}`} className="min-w-0">
                  <p className="font-mono text-xs font-bold text-blue-600">{item.code}</p>
                  <h3 className="mt-1 truncate text-lg font-extrabold text-slate-950">{item.name}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    보유 ETF {item.etfCount ?? 0}개 · 관련 테마 {(item.themes || []).filter(theme => theme.id !== 'etc').length}개
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleHoldingWatchlist(item.code)}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-600 transition-colors hover:bg-amber-100"
                  title="종목 즐겨찾기 해제"
                  aria-label={`${item.name} 종목 즐겨찾기 해제`}
                >
                  <Star size={15} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
          저장한 종목 정보를 찾지 못했습니다. 데이터 갱신 후 다시 확인해 주세요.
        </div>
      )}
    </section>
  );
}
export default function Watchlist() {
  useNoIndexPage();
  const [period, setPeriod] = useState('3m');
  const { watchlist, toggleWatchlist } = useWatchlistStore();
  const { selectedEtfs, addEtf, removeEtf } = useCompareStore();
  const { etfs, loading, error } = useETFData(period);
  const watchedEtfs = etfs.filter(etf => watchlist.includes(etf.code));

  const toggleCompare = (code) => {
    if (selectedEtfs.includes(code)) removeEtf(code);
    else addEtf(code);
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-950">
            <Star className="text-amber-600" fill="currentColor" /> 즐겨찾기 ETF
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            <span className="block">관심 ETF 및 종목을 브라우저에 저장해 기간 수익률과 기준일 종가를 다시 확인하는 도구입니다.</span>
            <span className="mt-1 block">브라우저 데이터, 쿠키, 사이트 저장소를 삭제하거나 다른 기기에서 접속하면 저장 목록이 사라질 수 있습니다.</span>
          </p>
        </div>
        {watchlist.length > 0 && (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700">
            {watchlist.length}개 저장됨
          </span>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-14">
          <Star size={48} className="mx-auto text-amber-500" />
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">아직 저장한 ETF가 없습니다</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            홈의 ETF 목록에서 별표를 누르면 관심 ETF가 이곳에 저장됩니다. 자주 보는 ETF를 모아두면 1주, 1개월, 3개월 등 기간 수익률을 빠르게 다시 확인하고 비교 목록에도 바로 추가할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm font-bold">
            <Link to="/" className="rounded-full bg-amber-500 px-4 py-2 text-slate-950 hover:bg-amber-400">
              ETF 찾아보기
            </Link>
            <Link to="/guide" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700">
              지표 해석 보기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex w-fit flex-wrap rounded-xl border border-slate-200 bg-white p-1">
            {PERIODS.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${period === item.id ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-4">ETF명</th>
                  <th className="px-4 py-4 text-right">기준일 종가</th>
                  <th className="px-4 py-4 text-right">{PERIODS.find(item => item.id === period)?.label} 수익률</th>
                  <th className="px-4 py-4 text-right">ETF 규모</th>
                  <th className="px-5 py-4 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-amber-600" /></td></tr>
                ) : error ? (
                  <tr><td colSpan="5" className="py-12 text-center text-xs text-rose-600">{error}</td></tr>
                ) : watchedEtfs.length > 0 ? watchedEtfs.map(etf => {
                  const rate = etf[`rate${period}`];
                  const hasRate = rate != null;
                  const positive = hasRate && rate >= 0;
                  return (
                    <tr key={etf.code} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ETFIcon etf={etf} size="sm" />
                          <div>
                            <Link to={`/etf/${etf.code}`} className="block font-semibold text-slate-900 hover:text-amber-600">{etf.name}</Link>
                            <span className="font-mono text-xs text-slate-500">{etf.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-700">{etf.price.toLocaleString()}원</td>
                      <td className={`px-4 py-4 text-right font-mono font-semibold ${!hasRate ? 'text-slate-500' : positive ? 'text-rose-500' : 'text-blue-500'}`}>
                        <span className="flex items-center justify-end gap-0.5">
                          {hasRate && (positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
                          {hasRate ? `${positive ? '+' : ''}${rate}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-600">
                        {etf.aum == null ? '-' : `${etf.aum.toLocaleString()}억`}
                        <span className="block text-[9px] text-slate-500">{etf.assetValueType === 'netAssets' ? '순자산' : '시가총액'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => toggleWatchlist(etf.code)} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-600" title="즐겨찾기 해제">
                            <Star size={14} fill="currentColor" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompare(etf.code)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${selectedEtfs.includes(etf.code) ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                          >
                            {selectedEtfs.includes(etf.code) ? '비교중' : '비교하기'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="5" className="py-12 text-center text-sm text-slate-500">저장한 ETF 정보를 찾지 못했습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <HoldingWatchlistSection />
    </div>
  );
}
