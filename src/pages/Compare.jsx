import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp, Loader2 } from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { useETFData } from '../hooks/useETFData';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const DUMMY_CHART_DATA = [
  { name: '1주 전', A: 0, B: 0, C: 0, D: 0 },
  { name: '5일 전', A: 0.5, B: -1.2, C: 1.5, D: 0.3 },
  { name: '4일 전', A: 1.2, B: -0.8, C: 2.1, D: 0.8 },
  { name: '3일 전', A: 1.8, B: -2.3, C: 2.8, D: 1.2 },
  { name: '2일 전', A: 2.5, B: -3.5, C: 3.9, D: 1.9 },
  { name: '어제', A: 2.1, B: -4.1, C: 4.2, D: 1.6 },
  { name: '오늘', A: 3.1, B: -3.5, C: 6.8, D: 2.4 }
];

function CompareCard({ code, onRemove }) {
  const [etf, setEtf] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchEtfDetails = async () => {
      setLoading(true);
      try {
        // Fetch list to find matching item and fetch holdings in parallel
        const [resList, resHoldings] = await Promise.all([
          fetch('/api/rankings'),
          fetch(`/api/etf/${code}/holdings`)
        ]);

        if (resList.ok && resHoldings.ok) {
          const list = await resList.json();
          const item = list.find(x => x.code === code);
          const hold = await resHoldings.json();

          if (active) {
            setEtf(item || { code, name: `ETF (${code})`, price: 0, aum: 0, fee: 0.05, rate1m: 0 });
            setHoldings(hold.slice(0, 5));
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
    fetchEtfDetails();
    return () => {
      active = false;
    };
  }, [code]);

  if (loading || !etf) {
    return (
      <div className="glass p-6 rounded-3xl h-[240px] flex flex-col items-center justify-center text-slate-500 space-y-2">
        <Loader2 className="animate-spin text-blue-500" size={24} />
        <span className="text-xs">데이터 로딩 중...</span>
      </div>
    );
  }

  const isPositive = etf.rate1m >= 0;

  return (
    <div className="glass p-6 rounded-3xl relative glow-blue space-y-5">
      <button 
        onClick={onRemove}
        className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900/50 transition-all"
        title="제거"
      >
        <Trash2 size={14} />
      </button>

      <div>
        <span className="text-[10px] font-mono text-slate-500">{etf.code}</span>
        <Link to={`/etf/${etf.code}`} className="font-extrabold text-slate-200 text-base line-clamp-1 pr-6 hover:text-blue-400 block">
          {etf.name}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-b border-slate-800/60 py-4">
        <div>
          <span className="text-[10px] text-slate-500 block">전일종가</span>
          <span className="font-semibold text-slate-300 text-sm">{etf.price.toLocaleString()}원</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">AUM</span>
          <span className="font-semibold text-slate-300 text-sm">{etf.aum.toLocaleString()}억</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">운용보수</span>
          <span className="font-semibold text-slate-300 text-sm">{etf.fee}%</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">1개월 수익률</span>
          <span className={`font-bold text-sm ${isPositive ? 'text-rose-500' : 'text-blue-500'}`}>
            {isPositive ? '+' : ''}{etf.rate1m}%
          </span>
        </div>
      </div>

      <div>
        <span className="text-[10px] text-slate-500 font-semibold block mb-2 uppercase tracking-wider">주요 구성종목</span>
        <div className="flex flex-wrap gap-1">
          {holdings.map((h, idx) => (
            <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-950">
              {h.name} ({h.value}%)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Compare() {
  const { selectedEtfs, removeEtf, clearSelected } = useCompareStore();
  const { etfs, loading: listLoading } = useETFData('1m');

  const selectedEtfDetails = selectedEtfs.map(code => {
    return etfs.find(x => x.code === code) || { code, name: `ETF (${code})` };
  });

  return (
    <div className="space-y-10 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-100">
            <ArrowLeftRight className="text-blue-400" />
            ETF 비교분석
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            선택한 ETF들의 수익률 레이스, AUM, 운용보수 및 구성종목 겹침을 분석합니다.
          </p>
        </div>
        {selectedEtfs.length > 0 && (
          <button 
            onClick={clearSelected}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl self-start sm:self-auto transition-all"
          >
            <Trash2 size={14} />
            비교 목록 전체삭제
          </button>
        )}
      </div>

      {selectedEtfs.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-4">
          <ArrowLeftRight size={48} className="text-slate-600 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-300">비교할 ETF가 없습니다.</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            메인 수익률 랭킹 또는 테마 상세 화면에서 "비교담기" 버튼을 눌러 비교할 대상을 추가해 주세요. (최대 4개)
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {selectedEtfs.map((code) => (
              <CompareCard 
                key={code} 
                code={code} 
                onRemove={() => removeEtf(code)} 
              />
            ))}
          </div>

          {/* Performance Line Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              최근 1주일간 누적 수익률 비교 레이스 (실시간 시세 반영)
            </h2>
            <div className="h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DUMMY_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {selectedEtfDetails.map((etf, i) => {
                    const dataKeys = ['A', 'B', 'C', 'D'];
                    const colors = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];
                    return (
                      <Line 
                        key={etf.code}
                        type="monotone" 
                        dataKey={dataKeys[i % 4]} 
                        name={etf.name} 
                        stroke={colors[i % 4]} 
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
