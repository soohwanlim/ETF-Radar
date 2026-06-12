import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Loader2, Star } from 'lucide-react';
import { useETFData } from '../hooks/useETFData';
import { useCompareStore } from '../store/compareStore';
import { useWatchlistStore } from '../store/watchlistStore';

const PERIODS = [
  { id: '1d', label: '당일' },
  { id: '1w', label: '1주' },
  { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' },
  { id: '1y', label: '1년' },
  { id: '10y', label: '10년' },
];

export default function Watchlist() {
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-100">
            <Star className="text-amber-400" fill="currentColor" /> 즐겨찾기 ETF
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            별표로 저장한 ETF를 한곳에서 확인하고 비교 목록에 담을 수 있습니다.
          </p>
        </div>
        {watchlist.length > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
            {watchlist.length}개 저장됨
          </span>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center space-y-4">
          <Star size={48} className="mx-auto text-slate-700" />
          <h2 className="text-lg font-bold text-slate-300">저장한 ETF가 없습니다.</h2>
          <p className="text-sm text-slate-500">수익률 랭킹에서 별표를 누르면 이곳에 저장됩니다.</p>
          <Link to="/" className="inline-flex px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors">
            ETF 찾아보기
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
            {PERIODS.map(item => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === item.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl overflow-hidden overflow-x-auto glow-blue">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold">
                  <th className="py-4 px-5">ETF 명</th>
                  <th className="py-4 px-4 text-right">현재가</th>
                  <th className="py-4 px-4 text-right">{PERIODS.find(item => item.id === period)?.label} 수익률</th>
                  <th className="py-4 px-4 text-right">ETF 규모</th>
                  <th className="py-4 px-5 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin text-amber-400 mx-auto" /></td></tr>
                ) : error ? (
                  <tr><td colSpan="5" className="py-12 text-center text-rose-400 text-xs">{error}</td></tr>
                ) : watchedEtfs.length > 0 ? watchedEtfs.map(etf => {
                  const rate = etf[`rate${period}`];
                  const hasRate = rate != null;
                  const positive = hasRate && rate >= 0;
                  return (
                    <tr key={etf.code} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-5">
                        <Link to={`/etf/${etf.code}`} className="font-semibold text-slate-200 hover:text-amber-400 block">{etf.name}</Link>
                        <span className="text-xs text-slate-500 font-mono">{etf.code}</span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-300">{etf.price.toLocaleString()}원</td>
                      <td className={`py-4 px-4 text-right font-semibold font-mono ${!hasRate ? 'text-slate-500' : positive ? 'text-rose-500' : 'text-blue-500'}`}>
                        <span className="flex items-center justify-end gap-0.5">
                          {hasRate && (positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
                          {hasRate ? `${positive ? '+' : ''}${rate}%` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-400">
                        {etf.aum == null ? '-' : `${etf.aum.toLocaleString()}억`}
                        <span className="block text-[9px] text-slate-600">{etf.assetValueType === 'netAssets' ? '순자산' : '시가총액'}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => toggleWatchlist(etf.code)} className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400" title="즐겨찾기 해제">
                            <Star size={14} fill="currentColor" />
                          </button>
                          <button
                            onClick={() => toggleCompare(etf.code)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${selectedEtfs.includes(etf.code) ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                          >
                            {selectedEtfs.includes(etf.code) ? '비교중' : '비교담기'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="5" className="py-12 text-center text-slate-500 text-sm">저장한 ETF 정보를 찾지 못했습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
