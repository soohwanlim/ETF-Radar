import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Cpu, Bot, Shield, Zap, Sparkles, Activity, Landmark, Loader2 } from 'lucide-react';
import { useETFData } from '../hooks/useETFData';

const DUMMY_THEMES = [
  { id: 'semi', name: '반도체', icon: Cpu, rate1m: 6.4, desc: 'HBM, 온디바이스 AI, 소부장 관련 주요 ETF 소속', codes: ['453950', '463810', '391010'] },
  { id: 'nuclear', name: '원자력', icon: Sparkles, rate1m: 8.2, desc: '글로벌 AI 데이터센터 전력 공급을 위한 원전·SMR', codes: ['427110', '455500'] },
  { id: 'battery', name: '2차전지', icon: Zap, rate1m: -4.5, desc: '셀 제조사, 양극재·음극재 등 소재 전문 기업 투자', codes: ['305540'] },
  { id: 'ai', name: 'AI·로봇', icon: Bot, rate1m: 4.8, desc: '글로벌 AI 빅테크 및 로봇 자동화 밸류체인', codes: ['448880'] }
];

function ThemeEtfCard({ etf }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchHoldings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/etf/${etf.code}/holdings`);
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setHoldings(data.slice(0, 5)); // Keep top 5
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchHoldings();
    return () => {
      active = false;
    };
  }, [etf.code]);

  return (
    <div className="p-5 rounded-2xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 transition-colors space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-slate-500">{etf.code}</span>
          <Link to={`/etf/${etf.code}`} className="font-bold text-slate-200 text-base hover:text-blue-400 block">
            {etf.name}
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono self-start sm:self-auto">
          <div>
            <span className="text-[11px] text-slate-500 block text-right">전일종가</span>
            <span className="font-semibold text-slate-300">{etf.price.toLocaleString()}원</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block text-right">AUM</span>
            <span className="font-semibold text-slate-300">{etf.aum.toLocaleString()}억</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block text-right">수익률(1개월)</span>
            <span className={`font-bold ${etf.rate1m >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
              {etf.rate1m >= 0 ? '+' : ''}{etf.rate1m}%
            </span>
          </div>
        </div>
      </div>

      {/* Holdings Preview Tags */}
      <div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-semibold">TOP 5 구성종목</span>
        {loading ? (
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <Loader2 className="animate-spin" size={10} />
            로딩 중...
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {holdings.map((h, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/30 transition-colors">
                {h.name} ({h.value}%)
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Theme() {
  const [selectedTheme, setSelectedTheme] = useState('semi');
  
  // Fetch real crawled ETF prices and data
  const { etfs, loading: etfsLoading, error: etfsError } = useETFData('1m');

  const themeDetails = DUMMY_THEMES.find(t => t.id === selectedTheme) || DUMMY_THEMES[0];

  // Filter our fetched real ETFs by the codes mapped in the theme
  const filteredEtfs = etfs.filter(etf => themeDetails.codes.includes(etf.code));

  return (
    <div className="space-y-10 fade-in">
      <div className="py-4 space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-100">
          <LayoutGrid className="text-emerald-400" />
          테마별 핫 ETF
        </h1>
        <p className="text-slate-400 text-sm">
          시장 트렌드를 주도하는 주요 투자 테마에 소속된 ETF와 상위 구성종목을 확인하세요.
        </p>
      </div>

      {/* Grid: Theme list & Theme detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Theme Categories */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-slate-200 px-1">인기 테마 카테고리</h2>
          <div className="space-y-3">
            {DUMMY_THEMES.map((theme) => {
              const Icon = theme.icon;
              const isSelected = theme.id === selectedTheme;
              const isPositive = theme.rate1m >= 0;

              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 border-emerald-500/40 glow-emerald' 
                      : 'glass hover:bg-slate-900/30 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{theme.name}</div>
                      <div className="text-[11px] text-slate-500">{theme.codes.length}개 ETF</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold font-mono ${isPositive ? 'text-rose-500' : 'text-blue-500'}`}>
                    {isPositive ? '+' : ''}{theme.rate1m}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Theme ETFs & Holdings preview */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-6 rounded-3xl space-y-4">
            <div>
              <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">SELECTED THEME</span>
              <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 mt-1">
                {themeDetails.name} 테마 ETF 목록
              </h2>
              <p className="text-xs text-slate-400 mt-1">{themeDetails.desc}</p>
            </div>

            {/* ETF Cards in selected theme */}
            <div className="space-y-4 pt-2">
              {etfsLoading ? (
                <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-emerald-400" />
                  <span>실시간 시세 크롤링 동기화 중...</span>
                </div>
              ) : filteredEtfs.length > 0 ? (
                filteredEtfs.map((etf) => (
                  <ThemeEtfCard key={etf.code} etf={etf} />
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  이 테마의 실시간 ETF 데이터를 불러올 수 없거나 목록이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
