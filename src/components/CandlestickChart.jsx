import { useEffect, useMemo, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, CrosshairMode, createChart, createSeriesMarkers } from 'lightweight-charts';
import { Loader2, TrendingUp } from 'lucide-react';
import { loadOhlcSeries } from '../data/staticData';

const PERIOD_OPTIONS = [
  { key: '1w', label: '1주', days: 7 },
  { key: '1m', label: '1개월', days: 30 },
  { key: '3m', label: '3개월', days: 90 },
  { key: '1y', label: '1년', days: 365 },
];

const INTERVAL_OPTIONS = [
  { key: 'day', label: '일' },
  { key: 'week', label: '주' },
  { key: 'month', label: '월' },
];

function formatPrice(value) {
  return Number.isFinite(value) ? `${Math.round(value).toLocaleString()}원` : '-';
}

function formatRate(value) {
  if (!Number.isFinite(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function toCandle(row) {
  return {
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  };
}

function bucketKey(date, interval) {
  if (interval === 'month') return date.slice(0, 7);
  if (interval !== 'week') return date;

  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function aggregateCandles(candles, interval) {
  if (interval === 'day') return candles;

  const groups = new Map();
  for (const candle of candles) {
    const key = bucketKey(candle.time, interval);
    if (!groups.has(key)) {
      groups.set(key, {
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
      continue;
    }
    const target = groups.get(key);
    target.high = Math.max(target.high, candle.high);
    target.low = Math.min(target.low, candle.low);
    target.close = candle.close;
  }

  return [...groups.values()];
}

function candleRate(candle) {
  if (!candle?.open) return null;
  return ((candle.close - candle.open) / candle.open) * 100;
}

function getSeriesValue(param, series) {
  return param.seriesData?.get(series) || param.seriesPrices?.get(series) || null;
}

function formatChartDate(time) {
  const date = normalizeChartDate(time);
  return date || String(time || '');
}

function setVisiblePeriod(chart, candles, period) {
  if (!chart || !candles.length) return;
  const option = PERIOD_OPTIONS.find(item => item.key === period) || PERIOD_OPTIONS[2];
  const last = new Date(`${candles.at(-1).time}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() - option.days);
  const cutoff = last.toISOString().slice(0, 10);
  const firstIndex = Math.max(0, candles.findIndex(candle => candle.time >= cutoff));
  chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, firstIndex - 0.5),
    to: candles.length - 0.5,
  });
}

function normalizeChartDate(time) {
  if (!time) return null;
  if (typeof time === 'string') return time;
  if (typeof time === 'object' && time.year && time.month && time.day) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
  }
  return null;
}
function buildChangeMarkers(changeEvents, candles, interval) {
  if (!changeEvents?.length || !candles.length) return [];
  const candleTimes = new Set(candles.map(candle => candle.time));
  const markerByTime = new Map();
  for (const event of changeEvents) {
    let time = event.date;
    if (!candleTimes.has(time) && interval !== 'day') {
      const eventBucket = bucketKey(event.date, interval);
      time = candles.find(candle => bucketKey(candle.time, interval) === eventBucket)?.time;
    }
    if (!time || !candleTimes.has(time)) continue;
    markerByTime.set(time, {
      time,
      position: 'aboveBar',
      color: '#7c3aed',
      shape: 'circle',
      size: 1.15,
    });
  }
  return [...markerByTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}
export default function CandlestickChart({ code, selectedDate, onDateSelect, changeEvents = [] }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [rawRows, setRawRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('3m');
  const [interval, setInterval] = useState('day');
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let alive = true;
    loadOhlcSeries(code)
      .then(data => {
        if (!alive) return;
        setRawRows(data?.rows || []);
      })
      .catch(err => {
        if (!alive) return;
        setError(err.message || '가격 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const candles = useMemo(() => {
    const daily = (rawRows || []).map(toCandle).filter(item => (
      Number.isFinite(item.open)
      && Number.isFinite(item.high)
      && Number.isFinite(item.low)
      && Number.isFinite(item.close)
    ));
    return aggregateCandles(daily, interval);
  }, [interval, rawRows]);
  const changeMarkers = useMemo(
    () => buildChangeMarkers(changeEvents, candles, interval),
    [candles, changeEvents, interval],
  );
  const displayCandle = hovered || candles.at(-1) || null;
  const displayRate = candleRate(displayCandle);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !candles.length) return undefined;

    const chart = createChart(container, {
      height: 300,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.18)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.18)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#94a3b8', style: 2 },
        horzLine: { color: '#94a3b8', style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.35)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.35)',
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: formatChartDate,
        rightOffset: 4,
        barSpacing: interval === 'day' ? 8 : 16,
      },
      localization: {
        priceFormatter: price => Math.round(price).toLocaleString(),
        timeFormatter: formatChartDate,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addCandlestickSeries
      ? chart.addCandlestickSeries({
        upColor: '#ef4444',
        downColor: '#2563eb',
        borderUpColor: '#ef4444',
        borderDownColor: '#2563eb',
        wickUpColor: '#ef4444',
        wickDownColor: '#2563eb',
      })
      : chart.addSeries(CandlestickSeries, {
        upColor: '#ef4444',
        downColor: '#2563eb',
        borderUpColor: '#ef4444',
        borderDownColor: '#2563eb',
        wickUpColor: '#ef4444',
        wickDownColor: '#2563eb',
      });

    series.setData(candles);
    const markerApi = createSeriesMarkers(series, changeMarkers, { zOrder: 'aboveSeries' });
    setVisiblePeriod(chart, candles, period);
    chart.subscribeCrosshairMove(param => {
      const value = getSeriesValue(param, series);
      setHovered(value || null);
    });
    chart.subscribeClick(param => {
      const date = normalizeChartDate(param.time);
      if (date) onDateSelect?.(date);
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chartRef.current = null;
      seriesRef.current = null;
      markerApi.detach?.();
      chart.remove();
    };
  }, [candles, changeMarkers, interval, onDateSelect, period]);

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6">
        <div className="flex h-[300px] items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin text-blue-600" size={18} />
          가격 흐름을 불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !candles.length) {
    return (
      <div className="glass rounded-3xl p-6">
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
          가격 흐름 데이터 준비 중
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <TrendingUp size={18} className="text-blue-600" />
            가격 흐름
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-500">
            <button
              type="button"
              onClick={() => displayCandle?.time && onDateSelect?.(displayCandle.time)}
              className={`rounded-md px-1.5 py-0.5 font-bold transition-colors ${selectedDate === displayCandle?.time
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
              title="해당 날짜의 구성종목 변경 이력 보기"
            >
              {displayCandle?.time || '-'}
            </button>
            <span>시가 {formatPrice(displayCandle?.open)}</span>
            <span className="text-rose-500">고가 {formatPrice(displayCandle?.high)}</span>
            <span className="text-blue-600">저가 {formatPrice(displayCandle?.low)}</span>
            <span>종가 {formatPrice(displayCandle?.close)}</span>
            <span className={displayRate >= 0 ? 'text-rose-500' : 'text-blue-600'}>
              {formatRate(displayRate)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  period === option.key ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
            {INTERVAL_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setInterval(option.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  interval === option.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="h-[300px] w-full" />

      <div className="text-right text-[10px] text-slate-500">
        KRX Open API 일별 OHLC 기준 · 마우스 휠/드래그로 확대와 이동 가능
      </div>
    </div>
  );
}

