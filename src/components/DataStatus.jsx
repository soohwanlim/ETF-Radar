import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { loadDataStatus } from '../data/staticData';

const STATE_STYLE = {
  success: {
    icon: CheckCircle2,
    label: '자동 수집 정상',
    className: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
  },
  partial: {
    icon: AlertTriangle,
    label: '일부 데이터 이전 값 유지',
    className: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
  },
};

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
      <div className="border-b border-amber-500/20 bg-amber-500/5 text-amber-300">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-2 text-[11px]">
          <Clock3 size={13} />
          데이터 수집 상태를 확인할 수 없습니다.
        </div>
      </div>
    );
  }

  const config = STATE_STYLE[status.state] || STATE_STYLE.partial;
  const Icon = config.icon;

  return (
    <div className={`border-b ${config.className}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-[11px]">
        <span className="flex items-center gap-1.5 font-bold">
          <Icon size={13} />
          {config.label}
        </span>
        <span className="text-slate-400">기준일 {status.asOf}</span>
        <span className="text-slate-500">ETF {status.etfCount}개</span>
        <span className="text-slate-500">변경 {status.changeCount}건</span>
        {status.failedCount > 0 && (
          <span className="text-amber-300">실패 {status.failedCount}개</span>
        )}
      </div>
    </div>
  );
}
