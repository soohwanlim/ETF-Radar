import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart2, PieChart as PieIcon, Timeline, ShieldAlert, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const DUMMY_HOLDINGS = [
  { name: 'SK하이닉스', value: 24.5 },
  { name: '한미반도체', value: 18.2 },
  { name: '리노공업', value: 12.8 },
  { name: 'HPSP', value: 9.5 },
  { name: '이오테크닉스', value: 7.2 },
  { name: '원익IPS', value: 5.4 },
  { name: 'ISC', value: 4.8 },
  { name: '동진쎄미켐', value: 3.9 },
  { name: '주성엔지니어링', value: 3.5 },
  { name: '솔브레인', value: 3.1 }
];

const DUMMY_SECTORS = [
  { name: '메모리 반도체', value: 38.2 },
  { name: '반도체 장비', value: 35.6 },
  { name: '반도체 소재', value: 14.8 },
  { name: '반도체 부품/테스트', value: 11.4 }
];

const DUMMY_HISTORY = [
  { date: '2026-06-02', type: 'swap', message: '1위 종목 교체: 한미반도체 (비중 18.2%) ➡️ SK하이닉스 (비중 24.5%)' },
  { date: '2026-05-24', type: 'new', message: '신규 종목 편입: 리노공업 (비중 3.2% 편입)' },
  { date: '2026-05-10', type: 'weight', message: '기존 비중 확대: 한미반도체 비중 변경 (14.5% ➡️ 18.2%)' },
  { date: '2026-04-28', type: 'out', message: '완전 종목 편출: 네패스 (비중 1.5% 제외)' }
];

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function ETFDetail() {
  const { code } = useParams();
  const [period, setPeriod] = useState('1m');

  return (
    <div className="space-y-10 fade-in">
      
      {/* Back button & Title */}
      <div className="flex items-center gap-4 py-4">
        <Link to="/" className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span className="text-xs font-mono text-slate-500">{code || '453950'}</span>
          <h1 className="text-3xl font-extrabold text-slate-100">SOL 반도체소부장Fn 상세</h1>
        </div>
      </div>

      {/* Grid: Basic Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Basic Information & Historical Timeline (P0 Core) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl space-y-5">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800/80 pb-3">ETF 기본정보</h2>
            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">운용사</span>
                <span className="text-slate-300 font-semibold">신한자산운용</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">상장일</span>
                <span className="text-slate-300 font-semibold">2023-04-25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">순자산 (AUM)</span>
                <span className="text-slate-300 font-semibold">3,120억원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">총보수 (수수료)</span>
                <span className="text-slate-300 font-semibold text-emerald-400">연 0.30%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">분배금 주기</span>
                <span className="text-slate-300 font-semibold">연 1회 (4월)</span>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="glass p-6 rounded-3xl space-y-5">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <RefreshCw size={16} className="text-violet-400 animate-spin-slow" />
              구성종목 변경 이력 (최근 90일)
            </h2>
            
            <div className="relative pl-6 border-l border-slate-800 space-y-6">
              {DUMMY_HISTORY.map((hist, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline point */}
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
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Holdings Bar Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-400" />
              TOP 10 구성종목 및 비중
            </h2>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DUMMY_HOLDINGS} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {DUMMY_HOLDINGS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Pie Chart */}
          <div className="glass p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-400" />
              섹터별 세부 비중
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-around gap-6 pt-4">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DUMMY_SECTORS}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {DUMMY_SECTORS.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="space-y-3 w-full md:w-auto min-w-[200px]">
                {DUMMY_SECTORS.map((sector, i) => (
                  <div key={i} className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-300">{sector.name}</span>
                    </div>
                    <span className="font-mono text-slate-400">{sector.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
