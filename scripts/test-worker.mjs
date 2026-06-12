import assert from 'node:assert/strict';
import worker, { normalizeKrxEtf } from '../workers/index.js';

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

globalThis.fetch = originalFetch;
console.log('Worker data-source tests passed');
