import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Loader2, Star } from 'lucide-react';
import { useETFData } from '../hooks/useETFData';
import { useCompareStore } from '../store/compareStore';
import { useWatchlistStore } from '../store/watchlistStore';
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
            관심 ETF를 브라우저에 저장해 기간 수익률과 기준일 종가를 다시 확인하는 개인화 도구입니다. 이 페이지는 사용자별 저장 목록이라 검색 색인 대상에서는 제외됩니다.
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
    </div>
  );
}