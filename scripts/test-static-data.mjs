import assert from 'node:assert/strict';
import {
  calculateRate,
  compareHoldings,
  formatChange,
  isSupportedDomesticSpotEtf,
  normalizeIssueCode,
  parseNaverHoldings,
} from './static-data-lib.mjs';
import { buildThemeSignals } from './theme-signals.mjs';
import { buildHoldingIndex } from './holding-index.mjs';
import { getKrxClosureName, isKrxTradingDate, previousKrxTradingDate } from '../src/data/marketCalendar.js';

assert.equal(getKrxClosureName('2026-07-17'), '제헌절');
assert.equal(isKrxTradingDate('2026-07-17'), false);
assert.equal(previousKrxTradingDate('2026-07-18'), '2026-07-16');
assert.equal(previousKrxTradingDate('2026-07-20'), '2026-07-16');

assert.equal(isSupportedDomesticSpotEtf({ etfTabCode: 1, itemname: 'KODEX 200' }), true);
assert.equal(isSupportedDomesticSpotEtf({ etfTabCode: 1, itemname: 'KODEX 미국S&P500' }), false);
assert.equal(calculateRate([['2026-06-01', 100], ['2026-06-08', 110]], '2026-06-08', 7), 10);
assert.equal(normalizeIssueCode('069500'), '069500');
assert.equal(normalizeIssueCode('A069500'), '069500');
assert.equal(normalizeIssueCode('KR7069500007'), '069500');
assert.equal(normalizeIssueCode('KR70182R0000'), '0182R0');

const html = `<div class="section etf_asset"><table><tbody>
  <tr><td><a href="/item/main.naver?code=005930">삼성전자</a></td><td>100</td><td class="per">30.00%</td></tr>
  <tr><td><a href="/item/main.naver?code=000660">SK하이닉스</a></td><td>50</td><td class="per">20.00%</td></tr>
</tbody></table>`;
const holdings = parseNaverHoldings(html, '2026-06-11');
assert.equal(holdings.length, 2);
assert.equal(holdings[0].code, '005930');

const changes = compareHoldings(
  [{ code: '005930', name: '삼성전자', shares: 100, weight: 30 }, { code: '000660', name: 'SK하이닉스', shares: 50, weight: 20 }],
  [{ code: '005930', name: '삼성전자', shares: 110, weight: 27 }, { code: '035420', name: 'NAVER', shares: 10, weight: 10 }],
);
assert.deepEqual(changes.map(change => change.type).sort(), ['new', 'out', 'weight']);
assert.equal(changes.find(change => change.holdingCode === '005930').classification, 'quantity_increase');
assert.equal(changes.find(change => change.holdingCode === '005930').shareChangeRate, 10);
assert.match(formatChange(changes.find(change => change.type === 'new')), /TOP 10 진입/);

const priceEffect = compareHoldings(
  [{ code: '005930', name: '삼성전자', shares: 100, weight: 20 }],
  [{ code: '005930', name: '삼성전자', shares: 100, weight: 23 }],
);
assert.equal(priceEffect[0].classification, 'price_effect');
assert.equal(priceEffect[0].shareChangeRate, 0);

const heldWeightDecrease = compareHoldings(
  [{ code: '000660', name: 'SK하이닉스', shares: 100, weight: 18 }],
  [{ code: '000660', name: 'SK하이닉스', shares: 80, weight: 17.8 }],
);
assert.equal(heldWeightDecrease[0].classification, 'quantity_decrease_weight_held');
assert.match(formatChange(heldWeightDecrease[0]), /수량 감소 · 비중 유지/);

const signals = buildThemeSignals(
  [
    { code: 'A', name: 'KODEX 반도체' },
    { code: 'B', name: 'TIGER 반도체TOP10' },
    { code: 'C', name: 'SOL 자동차TOP3' },
  ],
  [
    { code: 'A', etfName: 'KODEX 반도체', date: '2026-06-12', type: 'weight', classification: 'quantity_increase', holdingCode: '005930', holdingName: '삼성전자', previousWeight: 20, weight: 23, shareChange: 10, shareChangeRate: 10 },
    { code: 'B', etfName: 'TIGER 반도체TOP10', date: '2026-06-12', type: 'weight', classification: 'quantity_increase', holdingCode: '005930', holdingName: '삼성전자', previousWeight: 10, weight: 12, shareChange: 5, shareChangeRate: 5 },
    { code: 'A', etfName: 'KODEX 반도체', date: '2026-06-12', type: 'weight', classification: 'quantity_decrease_weight_held', holdingCode: '000660', holdingName: 'SK하이닉스', previousWeight: 15, weight: 14.8, shareChange: -20, shareChangeRate: -20 },
    { code: 'B', etfName: 'TIGER 반도체TOP10', date: '2026-06-12', type: 'weight', classification: 'price_effect', holdingCode: '000660', holdingName: 'SK하이닉스', previousWeight: 12, weight: 14, shareChange: 0, shareChangeRate: 0 },
    { code: 'B', etfName: 'TIGER 반도체TOP10', date: '2026-06-12', type: 'weight', classification: 'quantity_decrease_weight_held', holdingCode: '000660', holdingName: 'SK하이닉스', previousWeight: 12, weight: 12.1, shareChange: -10, shareChangeRate: -10 },
  ],
);
assert.equal(signals.length, 2);
const increaseSignal = signals.find(signal => signal.holdingCode === '005930');
const heldDecreaseSignal = signals.find(signal => signal.holdingCode === '000660');
assert.equal(increaseSignal.direction, 'increase');
assert.equal(increaseSignal.etfCount, 2);
assert.equal(increaseSignal.signalType, 'per_cu_quantity');
assert.equal(increaseSignal.averageShareChangeRate, 7.5);
assert.equal(heldDecreaseSignal.direction, 'decrease');
assert.equal(heldDecreaseSignal.signalType, 'per_cu_quantity');
const holdingIndex = buildHoldingIndex(
  [
    { code: 'A', name: 'KODEX 반도체' },
    { code: 'B', name: 'TIME 액티브 반도체' },
  ],
  {
    A: [{ code: '005930', name: '삼성전자', shares: 10, weight: 25, asOf: '2026-06-12' }],
    B: [{ code: '005930', name: '삼성전자', shares: 20, weight: 30, asOf: '2026-06-12' }],
  },
  { asOf: '2026-06-12' },
);
assert.equal(holdingIndex.count, 1);
assert.equal(holdingIndex.items[0].code, '005930');
assert.equal(holdingIndex.items[0].etfCount, 2);
assert.equal(holdingIndex.items[0].activeEtfCount, 1);
assert.equal(holdingIndex.items[0].etfs[0].code, 'B');
console.log('Static data tests passed');
