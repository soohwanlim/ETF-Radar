import assert from 'node:assert/strict';
import {
  calculateRate,
  compareHoldings,
  formatChange,
  isSupportedDomesticSpotEtf,
  parseNaverHoldings,
} from './static-data-lib.mjs';
import { buildThemeSignals } from './theme-signals.mjs';

assert.equal(isSupportedDomesticSpotEtf({ etfTabCode: 1, itemname: 'KODEX 200' }), true);
assert.equal(isSupportedDomesticSpotEtf({ etfTabCode: 1, itemname: 'KODEX 미국S&P500' }), false);
assert.equal(calculateRate([['2026-06-01', 100], ['2026-06-08', 110]], '2026-06-08', 7), 10);

const html = `<div class="section etf_asset"><table><tbody>
  <tr><td><a href="/item/main.naver?code=005930">삼성전자</a></td><td>100</td><td class="per">30.00%</td></tr>
  <tr><td><a href="/item/main.naver?code=000660">SK하이닉스</a></td><td>50</td><td class="per">20.00%</td></tr>
</tbody></table>`;
const holdings = parseNaverHoldings(html, '2026-06-11');
assert.equal(holdings.length, 2);
assert.equal(holdings[0].code, '005930');

const changes = compareHoldings(
  [{ code: '005930', name: '삼성전자', weight: 30 }, { code: '000660', name: 'SK하이닉스', weight: 20 }],
  [{ code: '005930', name: '삼성전자', weight: 27 }, { code: '035420', name: 'NAVER', weight: 10 }],
);
assert.deepEqual(changes.map(change => change.type).sort(), ['new', 'out', 'weight']);
assert.match(formatChange(changes.find(change => change.type === 'new')), /TOP 10 신규 진입/);

const signals = buildThemeSignals(
  [
    { code: 'A', name: 'KODEX 반도체' },
    { code: 'B', name: 'TIGER 반도체TOP10' },
    { code: 'C', name: 'SOL 자동차TOP3' },
  ],
  [
    { code: 'A', etfName: 'KODEX 반도체', date: '2026-06-12', type: 'weight', holdingCode: '005930', holdingName: '삼성전자', previousWeight: 20, weight: 23 },
    { code: 'B', etfName: 'TIGER 반도체TOP10', date: '2026-06-12', type: 'new', holdingCode: '005930', holdingName: '삼성전자', previousWeight: null, weight: 12 },
  ],
);
assert.equal(signals.length, 1);
assert.equal(signals[0].direction, 'increase');
assert.equal(signals[0].etfCount, 2);

console.log('Static data tests passed');
