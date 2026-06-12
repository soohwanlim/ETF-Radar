import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, LayoutGrid, ShieldAlert, TrendingUp, RefreshCw, Star, X } from 'lucide-react';
import Home from './pages/Home';
import Theme from './pages/Theme';
import Compare from './pages/Compare';
import ETFDetail from './pages/ETFDetail';
import Changes from './pages/Changes';
import Watchlist from './pages/Watchlist';
import { useCompareStore } from './store/compareStore';

function FloatingCompareBar() {
  const { selectedEtfs, clearSelected } = useCompareStore();
  const location = useLocation();

  if (selectedEtfs.length === 0 || location.pathname === '/compare') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900/95 border border-blue-500/30 text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur-md z-50 fade-in glow-blue">
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
        </span>
        <div className="text-xs">
          <span className="font-extrabold">{selectedEtfs.length}개</span>의 ETF가 선택됨
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link 
          to="/compare"
          className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 px-4 py-2 rounded-xl font-bold shadow-md hover:scale-[1.03] transition-all"
        >
          <ArrowLeftRight size={14} />
          비교분석 시작
        </Link>
        <button
          type="button"
          onClick={clearSelected}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-3 py-2 rounded-xl hover:bg-slate-800 transition-all"
          title="비교 목록 전체 해제"
        >
          <X size={14} />
          전체 해제
        </button>
      </div>
    </div>
  );
}

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 bg-slate-950/70 border-b border-slate-900/80 backdrop-blur-md z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center font-black text-slate-950 text-sm group-hover:scale-105 transition-transform">
            ER
          </div>
          <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-200">
            ETF Radar
          </span>
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isActive('/') 
                ? 'bg-slate-900 text-blue-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={14} />
            수익률 랭킹
          </Link>
          <Link
            to="/theme"
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isActive('/theme') 
                ? 'bg-slate-900 text-emerald-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} />
            테마 핫 ETF
          </Link>
          <Link
            to="/compare"
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isActive('/compare') 
                ? 'bg-slate-900 text-violet-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight size={14} />
            비교분석
          </Link>
          <Link
            to="/watchlist"
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isActive('/watchlist')
                ? 'bg-slate-900 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star size={14} />
            즐겨찾기
          </Link>
          <Link
            to="/changes"
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isActive('/changes')
                ? 'bg-slate-900 text-violet-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw size={14} />
            변경 감지
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-950">
        
        {/* Navigation */}
        <Navigation />

        {/* Main Content */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/theme" element={<Theme />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/changes" element={<Changes />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/etf/:code" element={<ETFDetail />} />
          </Routes>
        </main>

        {/* Floating Compare Bar */}
        <FloatingCompareBar />

        {/* Footer Disclaimer (P0 Obligation) */}
        <footer className="bg-slate-950 border-t border-slate-900/60 py-8 px-6 mt-12 text-slate-500 text-xs">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-400 font-semibold">
              <ShieldAlert size={14} className="text-amber-500" />
              면책 사항 (Disclaimer)
            </div>
            <p className="text-center md:text-right max-w-2xl text-[10px] text-slate-500 leading-relaxed">
              본 서비스의 모든 ETF 데이터 및 수익률 정보는 크롤링 및 수동 데이터베이스를 기반으로 제공되는 참고용이며, 투자 권유가 아닙니다. 
              투자 결과에 대한 최종 책임은 투자자 본인에게 있습니다.
            </p>
          </div>
        </footer>

      </div>
    </Router>
  );
}
