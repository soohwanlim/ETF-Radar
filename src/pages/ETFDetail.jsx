import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart2, Info, Loader2, LineChart as LineChartIcon } from 'lucide-react';
import { useETFDetail, useETFHoldings, useETFHistory, useETFPriceSeries } from '../hooks/useETFData';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from 'recharts';
import ETFIcon from '../components/ETFIcon';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];
const PRICE_PERIODS = [
  ['1m', '1개월', 30],
  ['3m', '3개월', 90],
  ['1y', '1년', 365],
  ['all', '전체', null],
];

export default function ETFDetail() {
  const { code } = useParams();
  const [pricePeriod, setPricePeriod] = useState('3m');

  // Load detail, holdings, and history from the latest daily static snapshot.
  const { detail, loading: detailLoading, error: detailError } = useETFDetail(code);
  const { holdings, loading: holdingsLoading, error: holdingsError } = useETFHoldings(code);
  const { history, loading: historyLoading, error: historyError } = useETFHistory(code);
  const { series: priceSeries, loading: priceLoading, error: priceError } = useETFPriceSeries(code);

  const priceChartData = useMemo(() => {
    const selectedPeriod = PRICE_PERIODS.find(([key]) => key === pricePeriod);
    const days = selectedPeriod?.[2];
    const source = days ? priceSeries.slice(-days) : priceSeries;

    return source
      .map((item) => {
        const date = Array.isArray(item) ? item[0] : item?.date;
        const close = Array.isArray(item) ? item[1] : item?.close;
        return { date, close, label: date?.slice(5) };
      })
      .filter((item) => item.date && item.close != null);
  }, [pricePeriod, priceSeries]);

  const priceChangeRate = useMemo(() => {
    if (priceChartData.length < 2) return null;
    const first = priceChartData[0].close;
    const last = priceChartData.at(-1).close;
    if (!first || !last) return null;
    return ((last - first) / first) * 100;
  }, [priceChartData]);

  if (detailLoading) {
    return (
      <div className="flex min-h-[1800px] flex-col items-center justify-center space-y-4 text-slate-600 md:min-h-[900px]">
        <Loader2 className="animate-spin text-blue-500" size={36} />
        <span>ETF 상세 정보와 구성종목 조회 중...</span>
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="flex min-h-[900px] flex-col items-center justify-center space-y-4 text-rose-500">
        <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
        <p className="text-sm text-slate-600">{detailError}</p>
        <Link to="/" className="text-xs px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const historyGroups = (history || []).reduce((groups, item) => {
    const latestGroup = groups.at(-1);
    if (latestGroup?.date === item.date) {
      latestGroup.items.push(item);
    } else {
      groups.push({ date: item.date, items: [item] });
    }
    return groups;
  }, []);

  return (
    <div className="min-h-[1800px] space-y-10 fade-in md:min-h-[900px]">
      
      {/* Back button & Title */}
      <div className="flex items-center gap-4 py-4">
        <Link to="/" className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all">
          <ArrowLeft size={16} />
        </Link>
        {detail && (
          <><ETFIcon etf={detail} size="lg" /><div>
            <span className="text-xs font-mono text-slate-500">{detail.code}</span>
            <h1 className="text-3xl font-extrabold text-slate-950">{detail.name} 상세</h1>
          </div></>
        )}
      </div>

      {/* Grid: Basic Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Basic Information & Historical Timeline (P0 Core) */}
        <div className="lg:col-span-1 space-y-6">
          {detail && (
            <div className="glass p-6 rounded-3xl space-y-5">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3">ETF 기본정보</h2>
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">운용사</span>
                  <span className="text-slate-700 font-semibold">{detail.provider || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">상장일</span>
                  <span className="text-slate-700 font-semibold">{detail.listingDate || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">순자산총액</span>
                  <span className="text-slate-700 font-semibold">{detail.netAssets == null ? 'KRX 승인 후 제공' : `${detail.netAssets.toLocaleString()}억원`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">시가총액</span>
                  <span className="text-slate-700 font-semibold">{detail.marketCap == null ? '-' : `${detail.marketCap.toLocaleString()}억원`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">총보수 (수수료)</span>
                  <span className="text-slate-700 font-semibold text-emerald-600">{detail.fee == null ? '-' : `연 ${detail.fee}%`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">기초지수</span>
                  <span className="text-slate-700 font-semibold text-right max-w-[160px]">{detail.benchmark || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">유형</span>
                  <span className="text-slate-700 font-semibold text-right">{detail.fundType || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NAV</span>
                  <span className="text-slate-700 font-semibold">{detail.nav == null ? '-' : `${detail.nav.toLocaleString()}원`}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500">
                기준일 {detail.asOf} · 출처 {detail.source}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="glass min-h-[720px] p-6 rounded-3xl space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <RefreshCw size={16} className="text-violet-600 animate-spin-slow" />
              구성종목 변경 이력 (최근 1년)
            </h2>
            
            {historyLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="animate-spin" size={14} />
                변경 이력 불러오는 중...
              </div>
            ) : historyError ? (
              <div className="text-xs text-slate-500">이력을 불러오지 못했습니다.</div>
            ) : history && history.length > 0 ? (
              <div className="space-y-6">
                {historyGroups.map((group, groupIndex) => (
                  <div key={group.date} className={groupIndex > 0 ? 'border-t border-slate-200 pt-5' : ''}>
                    <div className="relative pl-6 border-l border-slate-200 space-y-4">
                      {group.items.map((hist, idx) => (
                        <div key={`${hist.date}-${idx}-${hist.message}`} className="relative">
                          <span className={`absolute -left-[30px] top-1.5 w-2 h-2 rounded-full border-2 ${
                            hist.type === 'swap' ? 'bg-amber-500 border-amber-950 shadow-md shadow-amber-500/20' :
                            hist.type === 'new' ? 'bg-emerald-500 border-emerald-950' :
                            hist.type === 'out' ? 'bg-rose-500 border-rose-950' :
                            'bg-slate-500 border-slate-200'
                          }`} />

                          <span className="text-[10px] text-slate-500 block font-mono font-semibold">{hist.date}</span>
                          <p className="text-xs text-slate-700 mt-1">{hist.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">최근 1년간 큰 변동 사항이 없습니다.</div>
            )}
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Price History Line Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <LineChartIcon size={18} className="text-emerald-600" />
                종가 흐름
              </h2>
              <div className="flex flex-wrap gap-2">
                {PRICE_PERIODS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPricePeriod(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      pricePeriod === key
                        ? 'border-slate-900 bg-white text-slate-950 shadow-sm ring-2 ring-slate-900/10'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {priceLoading ? (
              <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin text-emerald-600" size={18} />
                종가 흐름 불러오는 중...
              </div>
            ) : priceError ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
                종가 흐름을 불러오지 못했습니다: {priceError}
              </div>
            ) : priceChartData.length > 1 ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {priceChartData[0].date} ~ {priceChartData.at(-1).date}
                  </div>
                  {priceChangeRate != null && (
                    <div className={`text-sm font-bold ${priceChangeRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {priceChangeRate >= 0 ? '+' : ''}{priceChangeRate.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.12} vertical={false} />
                      <XAxis dataKey="label" stroke="#64748B" fontSize={10} tickLine={false} minTickGap={28} />
                      <YAxis
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        width={58}
                        tickFormatter={(value) => `${Number(value).toLocaleString()}원`}
                        domain={['dataMin', 'dataMax']}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        labelStyle={{ color: '#CBD5E1' }}
                        formatter={(value) => [`${Number(value).toLocaleString()}원`, '종가']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                      />
                      <Line type="monotone" dataKey="close" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
                아직 표시할 종가 이력이 충분하지 않습니다.
              </div>
            )}

            <div className="text-right text-[10px] text-slate-500">
              KRX 종가 기준 · 실시간 시세가 아닙니다
            </div>
          </div>
          
          {/* Holdings Bar Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-600" />
              구성종목 및 비중
            </h2>
            {holdingsLoading ? (
              <div className="h-[280px] flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin text-blue-600" size={18} /> 구성종목 불러오는 중...
              </div>
            ) : holdingsError ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-slate-500">
                구성종목을 불러오지 못했습니다: {holdingsError}
              </div>
            ) : (
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
            )}
            {holdings.length > 0 && (
              <div className="text-[10px] text-slate-500 text-right">
                기준일 {holdings[0].asOf} · 출처 {holdings[0].source}
                {holdings[0].coverage === 'top10' ? ' (상위 10개 구성자산)' : ' (전체 PDF)'}
              </div>
            )}
          </div>

          {/* 원천 데이터에 섹터 분류가 없어 임의 데이터로 채우지 않습니다. */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Info size={18} className="text-emerald-600" />
              데이터 기준
            </h2>
            <div className="text-sm text-slate-600 leading-relaxed">
              구성종목은 네이버 금융의 전일 기준 상위 10개 구성자산입니다. 공식 KRX Open API는 ETF 구성종목을 제공하지 않으므로,
              전체 PDF 기반 변경 감지는 향후 운용사별 데이터 연동이 필요합니다.
            </div>
            {detail?.description && (
              <div className="text-sm text-slate-600 leading-relaxed pt-4 border-t border-slate-200">
                {detail.description}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
