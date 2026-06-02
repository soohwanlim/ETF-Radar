import React, { useState } from 'react';
import { LayoutGrid, Cpu, Bot, Shield, Zap, Sparkles, Activity, Landmark, ArrowUpRight } from 'lucide-react';

const DUMMY_THEMES = [
  { id: 'semi', name: '반도체', icon: Cpu, count: 8, rate1m: 6.4, desc: 'HBM, 온디바이스 AI, 소부장 관련 주요 ETF 소속' },
  { id: 'ai', name: 'AI·로봇', icon: Bot, count: 5, rate1m: 4.8, desc: '글로벌 AI 빅테크 및 로봇 자동화 밸류체인' },
  { id: 'nuclear', name: '원자력', icon: Sparkles, count: 4, rate1m: 8.2, desc: '글로벌 AI 데이터센터 전력 공급을 위한 원전·SMR' },
  { id: 'battery', name: '2차전지', icon: Zap, count: 6, rate1m: -4.5, desc: '셀 제조사, 양극재·음극재 등 소재 전문 기업 투자' },
  { id: 'defense', name: '조선·방산', icon: Shield, count: 3, rate1m: 5.1, desc: 'K-방산 수출 증대 및 친환경 조선 선박 모멘텀' },
  { id: 'bio', name: '바이오', icon: Activity, count: 7, rate1m: 1.2, desc: '신약 개발 바이오텍 및 바이오시밀러 위탁생산' },
  { id: 'finance', name: '금융', icon: Landmark, count: 4, rate1m: 3.5, desc: '주주환원 확대 밸류업 프로그램 수혜주 및 고배당 은행' },
];

const DUMMY_THEME_ETFS = {
  semi: [
    { code: '453950', name: 'SOL 반도체소부장Fn', price: 12890, rate1m: 8.2, aum: 3100, holdings: ['SK하이닉스', '한미반도체', '리노공업', 'HPSP', '이오테크닉스'] },
    { code: '463810', name: 'TIGER AI반도체핵심공정', price: 14210, rate1m: 9.5, aum: 2800, holdings: ['한미반도체', '이오테크닉스', '하나마이크론', 'ISC', '주성엔지니어링'] },
    { code: '391010', name: 'KODEX Fn시스템반도체', price: 9850, rate1m: 4.2, aum: 1500, holdings: ['삼성전자', '리노공업', '한미반도체', 'DB하이텍', '원익IPS'] }
  ],
  nuclear: [
    { code: '427110', name: 'HANARO 원자력iSelect', price: 14580, rate1m: 12.3, aum: 1100, holdings: ['두산에너빌리티', 'HD현대일렉트릭', 'LS ELECTRIC', '한국전력', '한전기술'] },
    { code: '455500', name: 'ACE 원자력테마', price: 15120, rate1m: 10.8, aum: 850, holdings: ['두산에너빌리티', 'HD현대일렉트릭', '한국전력', '현대건설', '한전KPS'] }
  ]
};

export default function Theme() {
  const [selectedTheme, setSelectedTheme] = useState('semi');

  const themeDetails = DUMMY_THEMES.find(t => t.id === selectedTheme) || DUMMY_THEMES[0];
  const etfs = DUMMY_THEME_ETFS[selectedTheme] || [];

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
                      <div className="text-[11px] text-slate-500">{theme.count}개 ETF</div>
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
              {etfs.length > 0 ? (
                etfs.map((etf) => (
                  <div key={etf.code} className="p-5 rounded-2xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 transition-colors space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-slate-500">{etf.code}</span>
                        <h3 className="font-bold text-slate-200 text-base hover:text-blue-400 cursor-pointer">{etf.name}</h3>
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
                          <span className="text-[11px] text-slate-500 block text-right">1개월 수익률</span>
                          <span className="font-bold text-rose-500">+{etf.rate1m}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Holdings Preview Tags */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-semibold">TOP 5 구성종목</span>
                      <div className="flex flex-wrap gap-1.5">
                        {etf.holdings.map((h, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/30 transition-colors">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  이 테마의 실시간 ETF 데이터를 연동 중입니다.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
