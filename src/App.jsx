import { lazy, Suspense, useEffect } from 'react';
import Home from './pages/Home';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, ArrowLeftRight, BarChart3, Grid2X2, RefreshCw, ShieldAlert, Star, X } from 'lucide-react';
import { useCompareStore } from './store/compareStore';
import DataStatus from './components/DataStatus';

const About = lazy(() => import('./pages/About'));
const Theme = lazy(() => import('./pages/Theme'));
const Compare = lazy(() => import('./pages/Compare'));
const Active = lazy(() => import('./pages/Active'));
const ETFDetail = lazy(() => import('./pages/ETFDetail'));
const Changes = lazy(() => import('./pages/Changes'));
const Guide = lazy(() => import('./pages/Guide'));
const Faq = lazy(() => import('./pages/Faq'));
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
const SITE_URL = 'https://etf-radar.net';

const DEFAULT_META = {
  title: 'ETF Radar | 국내 ETF 비교와 구성종목 변화',
  description: '국내 주식형 ETF의 수익률, TOP 10 구성종목 변화, 신규 상장 ETF, 액티브 ETF 공통 매수 신호를 매일 종가 기준 데이터로 비교합니다.',
  robots: 'index, follow',
};

const ROUTE_META = {
  '/': DEFAULT_META,
  '/theme': {
    title: '테마 ETF 비교 | ETF Radar',
    description: '반도체, 2차전지, 금융 등 국내 ETF를 테마별 수익률과 TOP 10 구성종목 변화로 비교합니다.',
  },
  '/active': {
    title: '액티브 ETF 공통 매수 신호 | ETF Radar',
    description: '여러 액티브 ETF가 최근 함께 늘린 종목과 1CU당 구성수량 변화를 확인합니다.',
  },
  '/compare': {
    title: '국내 ETF 비교 | 수익률·구성종목 비교 - ETF Radar',
    description: '국내 주식형 ETF의 기간 수익률, 기준일 종가, TOP 10 구성종목을 선택해 비교합니다.',
  },
  '/changes': {
    title: 'ETF 구성종목 변화 감지 | ETF Radar',
    description: '국내 ETF의 TOP 10 구성종목 진입·이탈과 1CU당 구성수량 변화를 기준일별로 확인합니다.',
  },
  '/about': {
    title: 'ETF Radar 소개 | 데이터 출처와 운영 방식',
    description: 'ETF Radar의 국내 ETF 데이터 출처, 자동 업데이트 방식, 서비스 목적과 투자 유의사항을 안내합니다.',
  },
  '/guide': {
    title: 'ETF 데이터 해석 안내 | ETF Radar',
    description: 'ETF 수익률, TOP 10 구성종목 변화, 1CU당 구성수량 변화, 액티브 ETF 신호를 해석하는 기준을 설명합니다.',
  },
  '/faq': {
    title: 'ETF Radar FAQ | 자주 묻는 질문',
    description: 'ETF Radar의 업데이트 시간, 데이터 출처, TOP 10 구성종목 변화, 액티브 ETF 신호에 대한 자주 묻는 질문입니다.',
  },
  '/policy': {
    title: '개인정보처리방침과 이용 안내 | ETF Radar',
    description: 'ETF Radar의 개인정보처리방침, 광고와 쿠키, 데이터 출처, 투자 유의사항과 문의 방법을 안내합니다.',
  },
  '/watchlist': {
    title: '즐겨찾기 ETF | ETF Radar',
    description: '브라우저에 저장한 관심 ETF를 다시 확인하는 개인화 도구입니다.',
    robots: 'noindex, follow',
  },
};

function upsertMeta(selector, createAttrs, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttrs).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeKey = ROUTE_META[pathname] ? pathname : pathname.startsWith('/etf/') ? '/compare' : '/';
    const meta = { ...DEFAULT_META, ...ROUTE_META[routeKey] };
    const canonicalPath = meta.robots?.includes('noindex') ? '/' : pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;

    document.title = meta.title;
    upsertMeta('meta[name="description"]', { name: 'description' }, meta.description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, meta.robots);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, meta.title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, meta.description);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [pathname]);

  return null;
}

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
      <RouteMeta />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0,#f8fafc_36%,#f8fafc_100%)] text-slate-950">
        <Navigation />
        <DataStatus />

        <main className="mx-auto w-full max-w-6xl px-5 py-7 pb-24 md:px-6 md:py-12 md:pb-12">
          <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center py-24 text-center text-sm text-slate-500">페이지를 불러오는 중입니다.</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/theme" element={<Theme />} />
              <Route path="/active" element={<Active />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/changes" element={<Changes />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/faq" element={<Faq />} />
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
                <Link to="/about" className="hover:text-blue-600">서비스 소개</Link>
                <Link to="/guide" className="hover:text-blue-600">데이터 해석 안내</Link>
                <Link to="/faq" className="hover:text-blue-600">FAQ</Link>
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
