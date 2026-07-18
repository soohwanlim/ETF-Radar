// KRX trading holidays that affect the domestic ETF collection schedule.
// Update this table annually when KRX publishes the next year's calendar.
const KRX_CLOSURES = new Map([
  ['2026-01-01', '신정'],
  ['2026-02-16', '설 연휴'],
  ['2026-02-17', '설날'],
  ['2026-02-18', '설 연휴'],
  ['2026-03-02', '삼일절 대체휴일'],
  ['2026-05-01', '근로자의 날'],
  ['2026-05-05', '어린이날'],
  ['2026-05-25', '부처님오신날 대체휴일'],
  ['2026-06-03', '전국동시지방선거일'],
  ['2026-07-17', '제헌절'],
  ['2026-08-17', '광복절 대체휴일'],
  ['2026-09-24', '추석 연휴'],
  ['2026-09-25', '추석'],
  ['2026-10-05', '개천절 대체휴일'],
  ['2026-10-09', '한글날'],
  ['2026-12-25', '성탄절'],
  ['2026-12-31', '연말 휴장'],
]);

export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function getKrxClosureName(dateKey) {
  return KRX_CLOSURES.get(dateKey) || null;
}

export function isKrxTradingDate(dateKey) {
  const date = dateFromKey(dateKey);
  const day = date.getUTCDay();
  return day !== 0 && day !== 6 && !KRX_CLOSURES.has(dateKey);
}

export function previousKrxTradingDate(dateKey) {
  const date = dateFromKey(dateKey);
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (!isKrxTradingDate(toDateKey(date)));
  return toDateKey(date);
}
