import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { loadDataStatus } from '../data/staticData';

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

const CHECK_LABEL = {
  updated: '데이터 갱신',
  partial: '부분 갱신',
  no_new_data: '최신 기준일 유지',
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

export default function DataStatus() {
  const [status, setStatus] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    loadDataStatus()
      .then(setStatus)
      .catch(() => setUnavailable(true));
  }, []);

  if (!status && !unavailable) return null;

  if (unavailable) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 text-amber-700">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-2 text-[11px]">
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

  return (
    <div className={`border-b ${config.className}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-[11px]">
        <span className="flex items-center gap-1.5 font-bold">
          <Icon size={13} />
          {config.label}
        </span>
        <span className="text-slate-600">{status.asOf} 종가 기준</span>
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
          <span className="text-amber-300">실패 {status.failedCount}개</span>
        )}
      </div>
    </div>
  );
}
