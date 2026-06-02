import React, { useState } from 'react';
import { TrendingUp, RefreshCw, AlertCircle, Search, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useWatchlistStore } from '../store/watchlistStore';
import { useCompareStore } from '../store/compareStore';

// Dummy data for initial UI render
const DUMMY_ETFS = [
  { code: '379800', name: 'KODEX 미국S&P500핵심소비재', price: 15420, change: 1.25, rate1w: 2.3, rate1m: 4.8, rate3m: 12.5, rate1y: 28.4, aum: 4200, fee: 0.05, volume: 150000 },
  { code: '305540', name: 'TIGER 2차전지테마', price: 23150, change: -2.45, rate1w: -1.2, rate1m: -3.5, rate3m: -8.4, rate1y: -15.2, aum: 9800, fee: 0.45, volume: 850000 },
  { code: '453950', name: 'SOL 반도체소부장Fn', price: 12890, change: 3.15, rate1w: 4.5, rate1m: 8.2, rate3m: 15.6, rate1y: 34.2, aum: 3100, fee: 0.30, volume: 450000 },
  { code: '417630', name: 'ACE 미국S&P500', price: 17820, change: 0.85, rate1w: 1.5, rate1m: 3.2, rate3m: 8.9, rate1y: 22.1, aum: 15200, fee: 0.07, volume: 1200000 },
  { code: '448880', name: 'TIGER 미국테크TOP10 INDXX', price: 24130, change: 1.95, rate1w: 3.1, rate1m: 6.8, rate3m: 14.2, rate1y: 39.8, aum: 18400, fee: 0.49, volume: 980000 }
];

const DUMMY_CHANGES = [
  { code: '453950', etfName: 'SOL 반도체소부장Fn', type: 'swap', message: '1위 종목 교체: 한미반도체 ➡️ SK하이닉스', date: '2026-06-02', badge: '🔄 변경' },
  { code: '379800', etfName: 'KODEX 미국S&P500핵심소비재', type: 'new', message: '신규 편입: 코스트코 (비중 3.5%)', date: '2026-06-02', badge: '🆕 편입' },
  { code: '305540', etfName: 'TIGER 2차전지테마', type: 'out', message: '완전 편출: 엘앤에프', date: '2026-06-01', badge: '❌ 편출' }
];

export default function Home() {
  const [period, setPeriod] = useState('1m'); // 1w, 1m, 3m, 1y
  const [search, setSearch] = useState('');
  
  const { watchlist, toggleWatchlist } = useWatchlistStore();
  const { selectedEtfs, addEtf, removeEtf } = useCompareStore();

  const handleCompareToggle = (code) => {
    if (selectedEtfs.includes(code)) {
      removeEtf(code);
    } else {
      addEtf(code);
    }
  };

  const filteredEtfs = DUMMY_ETFS.filter(etf => 
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
            {DUMMY_CHANGES.map((change, idx) => (
              <div key={idx} className="glass p-5 rounded-2xl glow-violet hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-200 truncate">{change.etfName}</span>
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
            ))}
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
                {filteredEtfs.length > 0 ? (
                  filteredEtfs.map((etf) => {
                    const rate = getPeriodRate(etf);
                    const isPositive = rate >= 0;
                    
                    return (
                      <tr key={etf.code} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-200 hover:text-blue-400 cursor-pointer">{etf.name}</div>
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
