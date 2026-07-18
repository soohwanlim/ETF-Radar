import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { loadDataStatus } from '../data/staticData';
import { getKrxClosureName, isKrxTradingDate, previousKrxTradingDate } from '../data/marketCalendar';

const STATE_STYLE = {
  success: {
    icon: CheckCircle2,
    label: '자동 수집 정상',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  waiting: {
    icon: Clock3,
    label: '신규 데이터 대기',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  partial: {
    icon: AlertTriangle,
    label: '일부 데이터 이전 값 유지',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
};

const STATUS_BAR_INNER_CLASS = 'mx-auto flex min-h-9 max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-[11px]';

const CHECK_LABEL = {
  updated: '데이터 갱신',
  partial: '부분 갱신',
  no_new_data: '최신 기준일 유지',
  krx_unavailable: 'KRX 응답 대기',
  krx_forbidden: 'KRX 요청 제한',
};

function formatKstDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date);
}

function getKstParts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getExpectedMarketDate(now = new Date()) {
  const parts = getKstParts(now);
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const candidateKey = toDateKey(candidate);
  const isAfterClose = parts.hour > 15 || (parts.hour === 15 && parts.minute >= 30);
  if (isKrxTradingDate(candidateKey) && isAfterClose) return candidateKey;
  return previousKrxTradingDate(candidateKey);
}

function formatKoreanMonthDay(dateKey) {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function getPendingDataLabel(asOf) {
  if (!asOf) return null;
  const expectedMarketDate = getExpectedMarketDate();
  if (expectedMarketDate <= asOf) return null;
  return `${formatKoreanMonthDay(expectedMarketDate)} 데이터 대기 중 · 다음 자동 수집 예정`;
}

function getRecentMarketClosureLabel(now = new Date()) {
  const parts = getKstParts(now);
  const today = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const todayKey = toDateKey(today);
  const todayClosure = getKrxClosureName(todayKey);
  if (todayClosure) return `${formatKoreanMonthDay(todayKey)} 한국 증시 휴장 (${todayClosure})`;

  today.setUTCDate(today.getUTCDate() - 1);
  const yesterdayKey = toDateKey(today);
  const yesterdayClosure = getKrxClosureName(yesterdayKey);
  return yesterdayClosure ? `${formatKoreanMonthDay(yesterdayKey)} 한국 증시 휴장 (${yesterdayClosure})` : null;
}

export default function DataStatus() {
  const [status, setStatus] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    loadDataStatus()
      .then(setStatus)
      .catch(() => setUnavailable(true));
  }, []);

  if (!status && !unavailable) {
    return (
      <div className="border-b border-slate-100 bg-white text-slate-400">
        <div className={STATUS_BAR_INNER_CLASS} aria-hidden="true">
          <span className="flex items-center gap-1.5 font-bold">
            <Clock3 size={13} /> 데이터 상태 확인 중
          </span>
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 text-amber-700">
        <div className={STATUS_BAR_INNER_CLASS}>
          <Clock3 size={13} />
          데이터 수집 상태를 확인할 수 없습니다.
        </div>
      </div>
    );
  }

  const latestAsOf = status.latestAvailableAsOf || status.asOf;
  const hasCurrentDataset = status.state === 'success' && latestAsOf === status.asOf;
  const visualState = status.lastCheckState === 'no_new_data' && !hasCurrentDataset ? 'waiting' : status.state;
  const config = STATE_STYLE[visualState] || STATE_STYLE.partial;
  const Icon = config.icon;
  const checkedAt = formatKstDateTime(status.lastCheckedAt);
  const checkLabel = CHECK_LABEL[status.lastCheckState];
  const pendingDataLabel = getPendingDataLabel(status.asOf);
  const marketClosureLabel = getRecentMarketClosureLabel();

  return (
    <div className={`border-b ${config.className}`}>
      <div className={STATUS_BAR_INNER_CLASS}>
        <span className="flex items-center gap-1.5 font-bold">
          <Icon size={13} />
          {config.label}
        </span>
        <span className="text-slate-600">{status.asOf} 종가 기준</span>
        {marketClosureLabel && !pendingDataLabel && (
          <span className="font-medium text-slate-600">{marketClosureLabel}</span>
        )}
        {pendingDataLabel && (
          <span className="font-medium text-amber-700">{pendingDataLabel}</span>
        )}
        {checkedAt && (
          <span className="text-slate-500">마지막 확인 {checkedAt}</span>
        )}
        {checkLabel && (
          <span className="text-slate-500">{checkLabel}</span>
        )}
        {status.latestAvailableAsOf && status.latestAvailableAsOf !== status.asOf && (
          <span className="text-slate-500">최신 KRX {status.latestAvailableAsOf}</span>
        )}
        <span className="text-slate-500">ETF {status.etfCount}개</span>
        <span className="text-slate-500">변경 {status.changeCount}건</span>
        {status.failedCount > 0 && (
          <span className="text-amber-700">실패 {status.failedCount}개</span>
        )}
      </div>
    </div>
  );
}
