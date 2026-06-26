import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, ArrowLeftRight, BarChart3, Grid2X2, RefreshCw, ShieldAlert, Star, X } from 'lucide-react';
import { useCompareStore } from './store/compareStore';
import DataStatus from './components/DataStatus';

const Home = lazy(() => import('./pages/Home'));
const Theme = lazy(() => import('./pages/Theme'));
const Compare = lazy(() => import('./pages/Compare'));
const Active = lazy(() => import('./pages/Active'));
const ETFDetail = lazy(() => import('./pages/ETFDetail'));
const Changes = lazy(() => import('./pages/Changes'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Policy = lazy(() => import('./pages/Policy'));

const NAV_ITEMS = [
  { to: '/', label: '홈', desktopLabel: '수익률', icon: BarChart3 },
  { to: '/theme', label: '테마', desktopLabel: '테마 ETF', icon: Grid2X2 },
  { to: '/active', label: '액티브', desktopLabel: '액티브', icon: Activity },
  { to: '/compare', label: '비교', desktopLabel: '비교분석', icon: ArrowLeftRight },
  { to: '/watchlist', label: '관심', desktopLabel: '즐겨찾기', icon: Star },
  { to: '/changes', label: '변경', desktopLabel: '변경 감지', icon: RefreshCw },
];

function useActivePath() {
  const location = useLocation();
  return path => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
}

function FloatingCompareBar() {
  const { selectedEtfs, clearSelected } = useCompareStore();
  const location = useLocation();

  if (selectedEtfs.length === 0 || location.pathname === '/compare') return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-lg -translate-x-1/2 items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl md:bottom-6">
      <span className="text-sm font-semibold">ETF {selectedEtfs.length}개 선택</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={clearSelected} className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="비교 목록 전체 해제">
          <X size={17} />
        </button>
        <Link to="/compare" className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold hover:bg-blue-400">
          비교하기
        </Link>
      </div>
    </div>
  );
}

function Navigation() {
  const isActive = useActivePath();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-symbol.png" alt="ETF Radar" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-950">ETF Radar</div>
              <div className="hidden text-[10px] text-slate-500 sm:block">국내 ETF를 더 쉽게</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, desktopLabel, icon: Icon }) => (
              <Link key={to} to={to} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${isActive(to) ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>
                <Icon size={15} />
                {desktopLabel}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive(to) ? 'text-blue-600' : 'text-slate-500'}`}>
              <Icon size={20} strokeWidth={isActive(to) ? 2.5 : 2} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0,#f8fafc_36%,#f8fafc_100%)] text-slate-950">
        <Navigation />
        <DataStatus />

        <main className="mx-auto w-full max-w-6xl px-5 py-7 pb-24 md:px-6 md:py-12 md:pb-12">
          <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center py-24 text-center text-sm text-slate-500">페이지를 불러오는 중입니다.</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/theme" element={<Theme />} />
              <Route path="/active" element={<Active />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/changes" element={<Changes />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/etf/:code" element={<ETFDetail />} />
              <Route path="/policy" element={<Policy />} />
            </Routes>
          </Suspense>
        </main>

        <FloatingCompareBar />

        <footer className="border-t border-slate-200 px-6 py-8 pb-24 text-xs text-slate-500 md:pb-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <ShieldAlert size={14} /> 투자 유의사항
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold text-slate-500">
                <Link to="/policy" className="hover:text-blue-600">개인정보처리방침</Link>
                <Link to="/policy" className="hover:text-blue-600">면책/투자 유의사항</Link>
                <Link to="/policy" className="hover:text-blue-600">문의</Link>
              </div>
            </div>
            <p className="max-w-2xl leading-relaxed md:text-right">
              ETF Radar의 정보는 참고용이며 투자 권유가 아닙니다. 투자 결과에 대한 최종 책임은 투자자 본인에게 있습니다.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
