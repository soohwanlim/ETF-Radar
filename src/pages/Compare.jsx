import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Trash2, TrendingUp, Loader2 } from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { useETFData } from '../hooks/useETFData';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { loadCompareData, loadHoldings } from '../data/staticData';

const PERIODS = [
  { id: '1d', label: '당일' }, { id: '1w', label: '1주' }, { id: '1m', label: '1개월' },
  { id: '3m', label: '3개월' }, { id: '1y', label: '1년' }, { id: '10y', label: '10년' },
];
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];

function getRate(etf, period) {
  return etf?.[`rate${period}`] ?? null;
}

function CompareCard({ etf, period, onRemove }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const rate = getRate(etf, period);

  useEffect(() => {
    let active = true;
    loadHoldings(etf.code)
      .then(data => active && setHoldings(data.slice(0, 5)))
      .catch(() => active && setHoldings([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [etf.code]);

  return (
    <div className="glass p-6 rounded-3xl relative glow-blue space-y-5">
      <button onClick={onRemove} className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg" title="비교에서 제거">
        <Trash2 size={14} />
      </button>
      <div>
        <span className="text-[10px] font-mono text-slate-500">{etf.code}</span>
        <Link to={`/etf/${etf.code}`} className="font-extrabold text-slate-200 pr-6 hover:text-blue-400 block truncate">{etf.name}</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs font-mono border-y border-slate-800/60 py-4">
        <div><span className="text-[10px] text-slate-500 block">기준일 종가</span><span className="font-semibold text-slate-300 text-sm">{(etf.price || 0).toLocaleString()}원</span></div>
        <div><span className="text-[10px] text-slate-500 block">{etf.assetValueType === 'netAssets' ? '순자산' : '시가총액'}</span><span className="font-semibold text-slate-300 text-sm">{etf.aum == null ? '-' : `${etf.aum.toLocaleString()}억`}</span></div>
        <div><span className="text-[10px] text-slate-500 block">총보수</span><span className="font-semibold text-slate-300 text-sm">{etf.fee == null ? '-' : `${etf.fee}%`}</span></div>
        <div>
          <span className="text-[10px] text-slate-500 block">선택 기간 수익률</span>
          <span className={`font-bold text-sm ${rate == null ? 'text-slate-500' : rate >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
            {rate == null ? '-' : `${rate >= 0 ? '+' : ''}${rate}%`}
          </span>
        </div>
      </div>
      <div>
        <span className="text-[10px] text-slate-500 font-semibold block mb-2">주요 구성종목</span>
        {loading ? <Loader2 className="animate-spin text-slate-600" size={14} /> : (
          <div className="flex flex-wrap gap-1">
            {holdings.map(holding => <span key={`${holding.code}-${holding.name}`} className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400">{holding.name} ({holding.value}%)</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Compare() {
  const [period, setPeriod] = useState('1w');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const { selectedEtfs, removeEtf, clearSelected } = useCompareStore();
  const { etfs, loading: etfsLoading } = useETFData(period);
  const selectedDetails = useMemo(() => selectedEtfs.map(code => etfs.find(etf => etf.code === code) || { code, name: `ETF (${code})` }), [selectedEtfs, etfs]);

  useEffect(() => {
    if (selectedEtfs.length === 0) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartLoading(true);
    loadCompareData(selectedEtfs, period)
      .then(data => active && setChartData(data))
      .catch(() => active && setChartData([]))
      .finally(() => active && setChartLoading(false));
    return () => { active = false; };
  }, [selectedEtfs, period]);

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-100"><ArrowLeftRight className="text-blue-400" /> ETF 비교분석</h1>
          <p className="text-slate-400 text-sm mt-2">최대 4개 ETF의 기간 수익률과 구성종목을 비교합니다.</p>
        </div>
        {selectedEtfs.length > 0 && <button onClick={clearSelected} className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl"><Trash2 size={14} /> 비교 목록 전체 삭제</button>}
      </div>

      {selectedEtfs.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center text-slate-400 space-y-4">
          <ArrowLeftRight size={48} className="text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-300">비교할 ETF가 없습니다.</h2>
          <p className="text-xs text-slate-500">메인 수익률 랭킹에서 비교할 ETF를 선택해 주세요.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
            {PERIODS.map(item => <button key={item.id} onClick={() => setPeriod(item.id)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === item.id ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{item.label}</button>)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {etfsLoading ? <div className="col-span-full py-16 flex justify-center"><Loader2 className="animate-spin text-blue-400" /></div> : selectedDetails.map(etf => <CompareCard key={etf.code} etf={etf} period={period} onRemove={() => removeEtf(etf.code)} />)}
          </div>

          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400" /> 선택 기간 누적수익률 비교</h2>
            <div className="h-[340px] w-full pt-4">
              {chartLoading ? (
                <div className="h-full flex items-center justify-center gap-2 text-slate-500 text-sm"><Loader2 className="animate-spin text-blue-400" /> 가격 시계열 계산 중...</div>
              ) : chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.4} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} minTickGap={24} tickFormatter={value => value.slice(5)} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={value => `${value}%`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} formatter={value => value == null ? '-' : `${value}%`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {selectedDetails.map((etf, index) => <Line key={etf.code} type="monotone" dataKey={etf.code} name={etf.name} stroke={COLORS[index]} strokeWidth={2.5} dot={false} connectNulls />)}
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">해당 기간의 가격 이력이 아직 없습니다.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
