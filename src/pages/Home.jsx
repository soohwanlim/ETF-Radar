import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, RefreshCw, Search, Star, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useWatchlistStore } from '../store/watchlistStore';
import { useCompareStore } from '../store/compareStore';
import { useETFData } from '../hooks/useETFData';
import { useChanges } from '../hooks/useChanges';

export default function Home() {
  const [period, setPeriod] = useState('1m'); // 1w, 1m, 3m, 1y
  const [search, setSearch] = useState('');
  
  const { watchlist, toggleWatchlist } = useWatchlistStore();
  const { selectedEtfs, addEtf, removeEtf } = useCompareStore();

  // Fetch live crawled ETF list & rankings
  const { etfs, loading: etfsLoading, error: etfsError } = useETFData(period);
  // Fetch live daily changes
  const { changes, loading: changesLoading, error: changesError } = useChanges();

  const handleCompareToggle = (code) => {
    if (selectedEtfs.includes(code)) {
      removeEtf(code);
    } else {
      addEtf(code);
    }
  };

  const filteredEtfs = etfs.filter(etf => 
    etf.name.toLowerCase().includes(search.toLowerCase()) || 
    etf.code.includes(search)
  );

  const getPeriodRate = (etf) => {
    switch (period) {
      case '1w': return etf.rate1w;
      case '3m': return etf.rate3m;
      case '1y': return etf.rate1y;
      case '1m':
      default: return etf.rate1m;
    }
  };

  return (
    <div className="space-y-10 fade-in">
      {/* Hero Header */}
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
          <TrendingUp size={16} />
          국내 최초 ETF 구성종목 실시간 감지 레이더
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400">
          ETF Radar
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          토스나 네이버에 없는 "구성종목 실시간 변경 감지" 기능을 제공합니다. 기간별 수익률을 비교하고 스마트하게 투자하세요.
        </p>
      </div>

      {/* Grid: Live Alerts & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Component Changes Alerts (P0 Core Feature) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">
              <RefreshCw size={18} className="text-violet-400 animate-spin-slow" />
              오늘의 구성종목 변동사항
            </h2>
            <span className="text-xs text-slate-500">전일 종가 기준</span>
          </div>

          <div className="space-y-4">
            {changesLoading ? (
              <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Loader2 className="animate-spin text-violet-400" />
                <span className="text-xs">실시간 변동 정보 로딩 중...</span>
              </div>
            ) : changesError ? (
              <div className="glass p-8 rounded-2xl text-center text-slate-500 text-xs">
                데이터 로딩 실패: {changesError}
              </div>
            ) : changes.length > 0 ? (
              changes.map((change, idx) => (
                <div key={idx} className="glass p-5 rounded-2xl glow-violet hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Link to={`/etf/${change.code}`} className="text-sm font-semibold text-slate-200 hover:text-violet-400 truncate">
                      {change.etfName}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      change.type === 'new' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      change.type === 'out' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {change.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{change.message}</p>
                  <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500">
                    <span>코드: {change.code}</span>
                    <span>{change.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass p-8 rounded-2xl text-center text-slate-500 text-xs">
                오늘의 구성종목 변동 내역이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right: Ranking Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">
              <Star size={18} className="text-emerald-400" />
              수익률 랭킹
            </h2>
            
            {/* Period Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              {['1w', '1m', '3m', '1y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                    period === p 
                      ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === '1w' ? '1주' : p === '1m' ? '1개월' : p === '3m' ? '3개월' : '1년'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="ETF 이름 또는 단축코드를 입력하세요..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* Table Container */}
          <div className="glass rounded-2xl overflow-hidden overflow-x-auto glow-blue">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-semibold">
                  <th className="py-4 px-5">ETF 명</th>
                  <th className="py-4 px-4 text-right">전일 종가</th>
                  <th className="py-4 px-4 text-right">수익률 ({period === '1w' ? '1주' : period === '1m' ? '1개월' : period === '3m' ? '3개월' : '1년'})</th>
                  <th className="py-4 px-4 text-right">순자산 (AUM)</th>
                  <th className="py-4 px-4 text-center">보수</th>
                  <th className="py-4 px-5 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {etfsLoading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                        <Loader2 className="animate-spin text-blue-500" />
                        <span className="text-xs">실시간 네이버 금융 ETF 목록 크롤링 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : etfsError ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-rose-500 text-xs font-semibold">
                      에러 발생: {etfsError}
                    </td>
                  </tr>
                ) : filteredEtfs.length > 0 ? (
                  filteredEtfs.map((etf) => {
                    const rate = getPeriodRate(etf);
                    const isPositive = rate >= 0;
                    
                    return (
                      <tr key={etf.code} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-4 px-5">
                          <Link to={`/etf/${etf.code}`} className="font-semibold text-slate-200 hover:text-blue-400 block">
                            {etf.name}
                          </Link>
                          <span className="text-xs text-slate-500 font-mono">{etf.code}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-300">
                          {etf.price.toLocaleString()}원
                        </td>
                        <td className={`py-4 px-4 text-right font-semibold font-mono ${isPositive ? 'text-rose-500' : 'text-blue-500'}`}>
                          <span className="flex items-center justify-end gap-0.5">
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {isPositive ? '+' : ''}{rate}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-400">
                          {etf.aum.toLocaleString()}억
                        </td>
                        <td className="py-4 px-4 text-center text-slate-400 font-mono">
                          {etf.fee}%
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => toggleWatchlist(etf.code)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                watchlist.includes(etf.code)
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                              }`}
                              title="즐겨찾기"
                            >
                              <Star size={14} fill={watchlist.includes(etf.code) ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => handleCompareToggle(etf.code)}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
                                selectedEtfs.includes(etf.code)
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              }`}
                            >
                              {selectedEtfs.includes(etf.code) ? '비교중' : '비교담기'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
