import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Filter, TrendingUp, TrendingDown,
  ArrowRightLeft, AlertCircle, Clock, ChevronDown, Loader2
} from 'lucide-react';

// ─── 데이터 훅 ─────────────────────────────────────────────────────────────

function useAllChanges(days = 7) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 오늘 변경사항 + 최근 히스토리 병렬 요청
      const [todayRes, historyRes] = await Promise.all([
        fetch('/api/changes'),
        fetch(`/api/changes/history?days=${days}`)
      ]);

      if (!todayRes.ok) throw new Error('변경사항을 불러오지 못했습니다.');

      const todayData = await todayRes.json();
      let historyData = [];
      if (historyRes.ok) {
        historyData = await historyRes.json();
      }

      // 중복 제거 (오늘 데이터 우선, 날짜+코드+타입으로 dedup)
      const seen = new Set();
      const merged = [...todayData, ...historyData].filter(c => {
        const key = `${c.date}-${c.code}-${c.type}-${c.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 날짜 내림차순 정렬
      merged.sort((a, b) => b.date.localeCompare(a.date));

      setChanges(merged);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChanges();
  }, [fetchChanges]);

  return { changes, loading, error, lastUpdated, refetch: fetchChanges };
}

// ─── 유틸 컴포넌트 ────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  new:    { label: '신규 편입', icon: TrendingUp,       color: 'emerald',  badge: '🆕', dot: '#10B981' },
  out:    { label: '완전 편출', icon: TrendingDown,     color: 'rose',     badge: '❌', dot: '#EF4444' },
  weight: { label: '비중 변동', icon: ArrowRightLeft,   color: 'amber',    badge: '⚖️', dot: '#F59E0B' },
  swap:   { label: '종목 교체', icon: RefreshCw,        color: 'violet',   badge: '🔄', dot: '#8B5CF6' },
  rank:   { label: '순위 변동', icon: ArrowRightLeft,   color: 'blue',     badge: '📊', dot: '#3B82F6' },
};

const COLOR_CLASSES = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    ring: 'ring-rose-500/30'    },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   ring: 'ring-amber-500/30'   },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400',  ring: 'ring-violet-500/30'  },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    ring: 'ring-blue-500/30'    },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.weight;
  const cls = COLOR_CLASSES[cfg.color];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cls.bg} ${cls.border} ${cls.text}`}>
      {cfg.badge} {cfg.label}
    </span>
  );
}

// 통계 카드
function StatCard({ type, count }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.weight;
  const cls = COLOR_CLASSES[cfg.color];
  const Icon = cfg.icon;
  return (
    <div className={`glass rounded-2xl p-5 border ${cls.border} flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls.bg}`}>
        <Icon size={18} className={cls.text} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-100">{count}</p>
        <p className={`text-xs font-semibold ${cls.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

// 날짜 그룹 헤더
function DateGroup({ date, children }) {
  const [open, setOpen] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const label = date === today ? '오늘' : date;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-2 group"
      >
        <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
          {label}
        </span>
        <div className="flex-1 h-px bg-slate-800/80" />
        <ChevronDown
          size={14}
          className={`text-slate-600 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="space-y-3 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// 단일 변경사항 카드
function ChangeCard({ change }) {
  const cfg = TYPE_CONFIG[change.type] || TYPE_CONFIG.weight;
  const cls = COLOR_CLASSES[cfg.color];
  const Icon = cfg.icon;

  return (
    <div className={`glass rounded-2xl p-5 border ${cls.border} hover:scale-[1.015] transition-transform duration-200 group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* 아이콘 */}
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${cls.bg}`}>
            <Icon size={16} className={cls.text} />
          </div>

          <div className="flex-1 min-w-0">
            {/* ETF 이름 + 코드 */}
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={`/etf/${change.code}`}
                className="text-sm font-bold text-slate-200 hover:text-blue-400 transition-colors truncate"
              >
                {change.etfName || change.code}
              </Link>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded shrink-0">
                {change.code}
              </span>
            </div>

            {/* 메시지 */}
            <p className="text-xs text-slate-300 leading-relaxed">{change.message}</p>
          </div>
        </div>

        {/* 배지 */}
        <div className="shrink-0">
          <TypeBadge type={change.type} />
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

const ALL_TYPES = ['new', 'out', 'weight', 'swap', 'rank'];
const DAYS_OPTIONS = [
  { value: 7, label: '최근 7일' },
  { value: 30, label: '최근 30일' },
  { value: 90, label: '최근 90일' },
  { value: 365, label: '최근 1년' },
];

export default function Changes() {
  const [selectedTypes, setSelectedTypes] = useState(ALL_TYPES);
  const [selectedDays, setSelectedDays] = useState(7);
  const [searchCode, setSearchCode] = useState('');

  const { changes, loading, error, lastUpdated, refetch } = useAllChanges(selectedDays);

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // 필터링
  const filtered = changes.filter(c => {
    const typeOk = selectedTypes.includes(c.type);
    const codeOk = searchCode.trim() === '' ||
      c.code.includes(searchCode.trim()) ||
      (c.etfName || '').toLowerCase().includes(searchCode.trim().toLowerCase());
    return typeOk && codeOk;
  });

  // 날짜별 그룹핑
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.date]) acc[c.date] = [];
    acc[c.date].push(c);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 통계
  const stats = ALL_TYPES.reduce((acc, t) => {
    acc[t] = changes.filter(c => c.type === t).length;
    return acc;
  }, {});

  return (
    <div className="space-y-10 fade-in">

      {/* 헤더 */}
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium">
          <RefreshCw size={16} className="animate-spin-slow" />
          거래일별 구성종목 변경 감지
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400">
          변경 감지 레이더
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          국내 주식형 현물 ETF의 상위 구성종목을 거래일마다 비교합니다.
          신규 편입·편출·비중 변동을 누구보다 빠르게 확인하세요.
        </p>
        {lastUpdated && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Clock size={11} />
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard type="new"    count={stats.new} />
        <StatCard type="out"    count={stats.out} />
        <StatCard type="weight" count={stats.weight + stats.rank} />
        <StatCard type="swap"   count={stats.swap} />
      </div>

      {/* 필터 바 */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* 검색 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="ETF 코드 또는 이름 검색..."
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>

          {/* 기간 선택 */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {DAYS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedDays(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDays === opt.value
                    ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 새로고침 */}
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {/* 타입 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
            <Filter size={12} />
            필터
          </div>
          {ALL_TYPES.map(type => {
            const cfg = TYPE_CONFIG[type];
            const cls = COLOR_CLASSES[cfg.color];
            const isOn = selectedTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                  isOn
                    ? `${cls.bg} ${cls.border} ${cls.text}`
                    : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                {cfg.badge} {cfg.label}
                {stats[type] > 0 && (
                  <span className="ml-1 bg-slate-900/80 rounded-full px-1.5 py-0.5 text-[10px] font-mono">
                    {stats[type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      {loading ? (
        <div className="glass rounded-2xl p-16 flex flex-col items-center justify-center space-y-4 text-slate-400">
          <Loader2 className="animate-spin text-violet-400" size={32} />
          <span className="text-sm">변경사항 로딩 중...</span>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="text-rose-500" size={32} />
          <p className="text-sm text-rose-400 font-semibold">{error}</p>
          <button
            onClick={refetch}
            className="text-xs px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-slate-100"
          >
            다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <RefreshCw size={32} className="opacity-30" />
          <p className="text-sm">조건에 맞는 변경사항이 없습니다.</p>
          {changes.length === 0 && (
            <p className="text-xs text-slate-600 text-center max-w-xs">
              첫 수집일에는 기준 스냅샷만 저장되며, 다음 거래일부터 최대 1년간 변경사항이 표시됩니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDates.map(date => (
            <DateGroup key={date} date={date}>
              {grouped[date].map((change, idx) => (
                <ChangeCard key={`${change.code}-${change.type}-${idx}`} change={change} />
              ))}
            </DateGroup>
          ))}
        </div>
      )}

      {/* 안내 배너 */}
      <div className="glass rounded-2xl p-5 border border-slate-800/50 flex gap-4 items-start">
        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-300">데이터 수집 안내</p>
          <p>
            구성종목 변경 데이터는 <strong className="text-slate-200">매일 오후 4시 (KST)</strong>,
            장 마감 후 네이버 금융의 상위 10개 구성자산을 수집해 최근 거래일 데이터와 비교합니다.
            해외·채권·원자재·레버리지·인버스·커버드콜 ETF는 현재 지원하지 않습니다.
          </p>
        </div>
      </div>

    </div>
  );
}
