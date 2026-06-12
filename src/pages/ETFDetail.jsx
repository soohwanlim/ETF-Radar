import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart2, Info, Loader2 } from 'lucide-react';
import { useETFDetail, useETFHoldings, useETFHistory } from '../hooks/useETFData';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function ETFDetail() {
  const { code } = useParams();

  // Fetch live detail, holdings, and change history
  const { detail, loading: detailLoading, error: detailError } = useETFDetail(code);
  const { holdings, loading: holdingsLoading, error: holdingsError } = useETFHoldings(code);
  const { history, loading: historyLoading, error: historyError } = useETFHistory(code);

  if (detailLoading || holdingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={36} />
        <span>ETF 상세 정보 및 KRX 자산구성내역 조회 중...</span>
      </div>
    );
  }

  if (detailError || holdingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-rose-500 space-y-4">
        <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
        <p className="text-sm text-slate-400">{detailError || holdingsError}</p>
        <Link to="/" className="text-xs px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 fade-in">
      
      {/* Back button & Title */}
      <div className="flex items-center gap-4 py-4">
        <Link to="/" className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all">
          <ArrowLeft size={16} />
        </Link>
        {detail && (
          <div>
            <span className="text-xs font-mono text-slate-500">{detail.code}</span>
            <h1 className="text-3xl font-extrabold text-slate-100">{detail.name} 상세</h1>
          </div>
        )}
      </div>

      {/* Grid: Basic Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Basic Information & Historical Timeline (P0 Core) */}
        <div className="lg:col-span-1 space-y-6">
          {detail && (
            <div className="glass p-6 rounded-3xl space-y-5">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800/80 pb-3">ETF 기본정보</h2>
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">운용사</span>
                  <span className="text-slate-300 font-semibold">{detail.provider || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">상장일</span>
                  <span className="text-slate-300 font-semibold">{detail.listingDate || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">순자산 (AUM)</span>
                  <span className="text-slate-300 font-semibold">{detail.aum == null ? '-' : `${detail.aum.toLocaleString()}억원`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">총보수 (수수료)</span>
                  <span className="text-slate-300 font-semibold text-emerald-400">{detail.fee == null ? '-' : `연 ${detail.fee}%`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">분배금 주기</span>
                  <span className="text-slate-300 font-semibold">{detail.distributionCycle || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="glass p-6 rounded-3xl space-y-5">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <RefreshCw size={16} className="text-violet-400 animate-spin-slow" />
              구성종목 변경 이력 (최근 90일)
            </h2>
            
            {historyLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="animate-spin" size={14} />
                변경 이력 불러오는 중...
              </div>
            ) : historyError ? (
              <div className="text-xs text-slate-500">이력을 불러오지 못했습니다.</div>
            ) : history && history.length > 0 ? (
              <div className="relative pl-6 border-l border-slate-800 space-y-6">
                {history.map((hist, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[30px] top-1.5 w-2 h-2 rounded-full border-2 ${
                      hist.type === 'swap' ? 'bg-amber-500 border-amber-950 shadow-md shadow-amber-500/20' :
                      hist.type === 'new' ? 'bg-emerald-500 border-emerald-950' :
                      hist.type === 'out' ? 'bg-rose-500 border-rose-950' :
                      'bg-slate-500 border-slate-950'
                    }`} />
                    
                    <span className="text-[10px] text-slate-500 block font-mono font-semibold">{hist.date}</span>
                    <p className="text-xs text-slate-300 mt-1">{hist.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">최근 90일간 큰 변동 사항이 없습니다.</div>
            )}
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Holdings Bar Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-400" />
              구성종목 및 비중
            </h2>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={holdings} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {holdings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KRX PDF에는 섹터 분류가 없어 임의 데이터로 채우지 않습니다. */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Info size={18} className="text-emerald-400" />
              데이터 기준
            </h2>
            <div className="text-sm text-slate-400 leading-relaxed">
              구성종목과 비중은 KRX 자산구성내역(PDF)을 기준으로 합니다. 섹터 분류는 원천 데이터에 포함되지 않아 임의로 추정하지 않습니다.
              KRX 수집이 불가능한 경우 네이버 금융의 전일 기준 상위 10개 구성자산으로 대체됩니다.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
