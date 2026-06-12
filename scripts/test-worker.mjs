import assert from 'node:assert/strict';
import worker, { detectChanges, normalizeKrxEtf } from '../workers/index.js';

const originalFetch = globalThis.fetch;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const normalized = normalizeKrxEtf({
  ISU_CD: '069500',
  ISU_NM: 'KODEX 200',
  TDD_CLSPRC: '12,345',
  CMPPREVDD_PRC: '100',
  FLUC_RT: '0.82',
  NAV: '12,340',
  MKTCAP: '1,000,000,000',
  INVSTASST_NETASST_TOTAMT: '1,200,000,000',
  ACC_TRDVOL: '50,000',
  IDX_IND_NM: '코스피 200',
});
assert.equal(normalized.price, 12345);
assert.equal(normalized.marketCap, 10);
assert.equal(normalized.netAssets, 12);

globalThis.fetch = async url => {
  if (String(url).includes('data-dbg.krx.co.kr')) {
    return jsonResponse({ OutBlock_1: [{
      ISU_CD: '069500', ISU_NM: 'KODEX 200', TDD_CLSPRC: '10,000', CMPPREVDD_PRC: '100',
      FLUC_RT: '1.01', NAV: '9,990', MKTCAP: '2,000,000,000',
      INVSTASST_NETASST_TOTAMT: '2,500,000,000', ACC_TRDVOL: '1,000', IDX_IND_NM: '코스피 200',
    }] });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

const krxResponse = await worker.fetch(new Request('https://example.com/api/rankings?period=1d'), { KRX_API_KEY: 'test' });
const krxItems = await krxResponse.json();
assert.equal(krxItems[0].source, 'KRX Open API');
assert.equal(krxItems[0].aum, 25);
assert.equal(krxItems[0].assetValueType, 'netAssets');

globalThis.fetch = async url => {
  if (String(url).includes('data-dbg.krx.co.kr')) return jsonResponse({ respCode: '401', respMsg: 'Unauthorized API Call' }, 401);
  if (String(url).includes('etfItemList.nhn')) {
    return jsonResponse({ result: { etfItemList: [{
      itemcode: '069500', etfTabCode: 1, itemname: 'KODEX 200', nowVal: 10000,
      changeVal: 100, changeRate: 1, risefall: '2', nav: 9990, marketSum: 200,
      quant: 1000, threeMonthEarnRate: 3,
    }] } });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

const fallbackResponse = await worker.fetch(new Request('https://example.com/api/rankings?period=1d'), { KRX_API_KEY: 'invalid' });
const fallbackItems = await fallbackResponse.json();
assert.equal(fallbackItems[0].source, 'Naver Finance');
assert.equal(fallbackItems[0].assetValueType, 'marketCap');

class MemoryKV {
  constructor() {
    this.data = new Map();
    this.puts = [];
  }

  async get(key, type) {
    const value = this.data.get(key);
    if (value == null) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.data.set(key, value);
    this.puts.push(key);
  }
}

function holdingsHtml(secondWeight = '20.00') {
  return `<div class="section etf_asset"><table><tbody>
    <tr><td><a href="/item/main.naver?code=005930">삼성전자</a></td><td>100</td><td class="per">30.00%</td></tr>
    <tr><td><a href="/item/main.naver?code=000660">SK하이닉스</a></td><td>50</td><td class="per">${secondWeight}%</td></tr>
  </tbody></table>`;
}

const holdingsKv = new MemoryKV();
globalThis.fetch = async url => {
  if (String(url).includes('finance.naver.com/item/main.naver')) {
    return new Response(holdingsHtml(), { status: 200 });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

const initial = await detectChanges('069500', { KV: holdingsKv }, '2026-06-11');
assert.equal(initial.changed, false);
assert.ok(holdingsKv.data.has('snapshot:latest:069500'));

const putsAfterInitial = holdingsKv.puts.length;
const unchanged = await detectChanges('069500', { KV: holdingsKv }, '2026-06-12');
assert.equal(unchanged.changed, false);
assert.equal(holdingsKv.puts.length, putsAfterInitial);

globalThis.fetch = async url => {
  if (String(url).includes('finance.naver.com/item/main.naver')) {
    return new Response(holdingsHtml('23.00'), { status: 200 });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

const changed = await detectChanges('069500', { KV: holdingsKv }, '2026-06-13');
assert.equal(changed.changed, true);
assert.equal(changed.changes[0].holdingCode, '000660');
assert.equal(changed.changes[0].previousWeight, 20);
assert.equal(changed.changes[0].weight, 23);
assert.ok(holdingsKv.data.has('history:069500'));

const schedulerKv = new MemoryKV();
globalThis.fetch = async url => {
  const requestUrl = String(url);
  if (requestUrl.includes('data-dbg.krx.co.kr')) {
    return jsonResponse({ OutBlock_1: [{
      ISU_CD: '069500', ISU_NM: 'KODEX 200', TDD_CLSPRC: '10,000', CMPPREVDD_PRC: '100',
      FLUC_RT: '1.01', NAV: '9,990', MKTCAP: '2,000,000,000',
      INVSTASST_NETASST_TOTAMT: '2,500,000,000', ACC_TRDVOL: '1,000', IDX_IND_NM: '코스피 200',
    }] });
  }
  if (requestUrl.includes('finance.naver.com/item/main.naver')) {
    return new Response(holdingsHtml(), { status: 200 });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

await worker.scheduled({ cron: '10 9 * * MON-FRI' }, { KV: schedulerKv, KRX_API_KEY: 'test' });
const schedulerStatus = await schedulerKv.get('scheduler:close-update', 'json');
assert.equal(schedulerStatus.state, 'success');
assert.ok(schedulerKv.data.has(`prices:${schedulerStatus.marketAsOf}`));

const schedulerPuts = schedulerKv.puts.length;
await worker.scheduled({ cron: '10 10 * * MON-FRI' }, { KV: schedulerKv, KRX_API_KEY: 'test' });
assert.equal(schedulerKv.puts.length, schedulerPuts);

globalThis.fetch = originalFetch;
console.log('Worker data-source and holdings tests passed');
