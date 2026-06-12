import assert from 'node:assert/strict';
import {
  calculateRate,
  compareHoldings,
  formatChange,
  isSupportedDomesticSpotEtf,
  parseNaverHoldings,
} from './static-data-lib.mjs';

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

console.log('Static data tests passed');
