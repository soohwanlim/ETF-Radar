import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
import { getInsightArticle, INSIGHT_ARTICLES } from '../src/data/insightArticles.js';
import {
  calculateChangeActivity,
  calculateHoldingConcentration,
  calculateHoldingSimilarity,
  calculateReturnRank,
  calculateReturnRanks,
  compareWithBenchmark,
  findSimilarEtfs,
} from '../src/data/etfAnalysis.js';
import { getEtfMeta, meetsEtfSearchQuality } from '../src/data/etfSearchQuality.js';
import { validateSnapshot } from './validate-static-data.mjs';
import {
  calculateHoldingAnalysis,
  getHoldingMeta,
  isLinkableHolding,
  meetsHoldingSearchQuality,
} from '../src/data/holdingSearchQuality.js';

const qualityHolding = {
  code: '005930', name: '삼성전자', asOf: '2026-09-09', etfCount: 3, activeEtfCount: 1,
  etfs: [
    { code: 'A', name: 'A ETF', weight: 30 },
    { code: 'B', name: 'B ETF', weight: 20 },
    { code: 'C', name: 'C ETF', weight: 10 },
  ],
};
const qualityHoldingChanges = [
  { holdingCode: '005930', date: '2026-09-09', type: 'new', classification: 'top10_new' },
  { holdingCode: '005930', date: '2026-09-08', type: 'weight', classification: 'quantity_increase' },
];
assert.equal(isLinkableHolding(qualityHolding), true);
assert.equal(isLinkableHolding({ code: 'CASH01', name: '원화예금' }), false);
assert.equal(meetsHoldingSearchQuality(qualityHolding, qualityHoldingChanges), true);
assert.equal(meetsHoldingSearchQuality({ ...qualityHolding, etfCount: 2 }, qualityHoldingChanges), false);
assert.deepEqual(calculateHoldingAnalysis(qualityHolding, qualityHoldingChanges), {
  totalTop10Weight: 60,
  topEtfs: qualityHolding.etfs,
  latestChangeDate: '2026-09-09',
  changeCount: 2,
  entries: 1,
  exits: 0,
  increases: 1,
  decreases: 0,
});
assert.equal(getHoldingMeta(qualityHolding, true).robots, 'index, follow');
assert.match(getHoldingMeta(qualityHolding, true).title, /삼성전자 \(005930\)/);
assert.equal(getHoldingMeta(qualityHolding, false).robots, 'noindex, follow');

const deployedHoldings = JSON.parse(await readFile(new URL('../public/data/holdings.json', import.meta.url), 'utf8'));
assert.equal(deployedHoldings['479850'].length, 10);
assert.ok(deployedHoldings['479850'].every(isLinkableHolding));

const validSnapshot = {
  etfs: [{ code: '069500', name: 'KODEX 200', asOf: '2026-09-09', price: 50000, aum: 1000 }],
  holdings: { '069500': [{ code: '005930', name: '삼성전자', asOf: '2026-09-09', shares: 10, weight: 30 }] },
  manifest: { asOf: '2026-09-09', etfCount: 1 },
  status: { asOf: '2026-09-09', etfCount: 1, holdingsCount: 1, failedCount: 0, failures: [] },
  ohlcManifest: { etfCount: 1, items: [{ code: '069500', from: '2026-09-08', to: '2026-09-09', rowCount: 2 }] },
  ohlcByCode: new Map([['069500', {
    code: '069500', from: '2026-09-08', to: '2026-09-09', rowCount: 2,
    rows: [['2026-09-08', 100, 110, 90, 105], ['2026-09-09', 105, 115, 100, 110]],
  }]]),
};
assert.deepEqual(validateSnapshot(validSnapshot), []);
assert.ok(validateSnapshot({
  ...validSnapshot,
  etfs: [...validSnapshot.etfs, { ...validSnapshot.etfs[0], price: -1 }],
}).some(problem => problem.includes('duplicate code')));
assert.ok(validateSnapshot({
  ...validSnapshot,
  ohlcByCode: new Map([['069500', { ...validSnapshot.ohlcByCode.get('069500'), rows: [['2026-09-09', 100, 90, 95, 105]] }]]),
}).some(problem => problem.includes('high is below')));

const qualityEtf = { code: '069500', name: 'KODEX 200', description: '가'.repeat(80), provider: '삼성자산운용', listingDate: '2002-10-14', asOf: '2026-09-09', price: 50000, rate1m: 1.2, rate3m: 3.4 };
assert.equal(meetsEtfSearchQuality(qualityEtf, [{}, {}, {}]), true);
assert.equal(meetsEtfSearchQuality({ ...qualityEtf, description: '짧음' }, [{}, {}, {}]), false);
assert.equal(meetsEtfSearchQuality(qualityEtf, [{}, {}]), false);
assert.deepEqual(getEtfMeta(null), {
  title: 'ETF 상세 정보를 찾을 수 없습니다 | ETF Radar',
  description: '요청한 ETF 상세 정보를 찾을 수 없습니다. ETF Radar 홈에서 지원하는 국내 ETF를 검색해 주세요.',
  robots: 'noindex, follow',
});
assert.match(getEtfMeta(qualityEtf, true).title, /KODEX 200 \(069500\)/);
assert.equal(getEtfMeta(qualityEtf, true).robots, 'index, follow');

const prerenderSource = await readFile(new URL('./prerender-static-pages.mjs', import.meta.url), 'utf8');
const sitemapSource = await readFile(new URL('./generate-sitemap.mjs', import.meta.url), 'utf8');
assert.ok(prerenderSource.includes("`${pathname.replace(/^\\//, '')}.html`"));
assert.ok(sitemapSource.includes("`${route.pathname.replace(/^\\//, '')}.html`"));
assert.ok(!prerenderSource.includes("pathname.replace(/^\\//, ''), 'index.html'"));

assert.equal(INSIGHT_ARTICLES.length, 4);
assert.equal(new Set(INSIGHT_ARTICLES.map(article => article.slug)).size, INSIGHT_ARTICLES.length);
for (const article of INSIGHT_ARTICLES) {
  assert.equal(getInsightArticle(article.slug), article);
  assert.ok(article.title.length >= 20);
  assert.ok(article.description.length >= 50);
  assert.ok(article.sections.length >= 4);
  assert.ok(article.sections.every(section => section.paragraphs.length >= 1));
  assert.ok(article.checklist.length >= 4);
}
assert.equal(getInsightArticle('unknown-article'), null);

const analysisEtfs = [
  { code: 'A', name: 'A ETF', rate1m: 10, rate3m: 20 },
  { code: 'B', name: 'B ETF', rate1m: 15, rate3m: 10 },
  { code: 'C', name: 'C ETF', rate1m: 10, rate3m: null },
  { code: 'D', name: 'D ETF', rate1m: -5, rate3m: 0 },
];
assert.deepEqual(calculateReturnRank(analysisEtfs, 'A', '1m'), {
  period: '1m', rate: 10, rank: 2, total: 4, percentile: 66.7,
});
assert.equal(calculateReturnRank(analysisEtfs, 'C', '1m').rank, 2);
assert.equal(calculateReturnRank(analysisEtfs, 'C', '3m'), null);
assert.equal(calculateReturnRank(analysisEtfs, 'A', 'invalid'), null);
assert.equal(calculateReturnRanks(analysisEtfs, 'A')['3m'].rank, 1);
assert.deepEqual(compareWithBenchmark(analysisEtfs[0], analysisEtfs[1], '1m'), {
  period: '1m', rate: 10, benchmarkCode: 'B', benchmarkName: 'B ETF', benchmarkRate: 15, difference: -5,
});

const analysisHoldings = [
  { code: '001', name: '첫 종목', weight: 35 },
  { code: '002', name: '둘째 종목', weight: 20 },
  { code: '003', name: '셋째 종목', weight: 10 },
  { code: '004', name: '넷째 종목', weight: 5 },
];
assert.deepEqual(calculateHoldingConcentration(analysisHoldings), {
  holdingCount: 4,
  topHolding: { code: '001', name: '첫 종목', weight: 35 },
  top3Weight: 65,
  top10Weight: 70,
  level: 'high',
  coverage: 'top10',
});
assert.equal(calculateHoldingConcentration([]), null);

const activity = calculateChangeActivity([
  { date: '2026-09-10', classification: 'top10_new' },
  { date: '2026-09-05', classification: 'quantity_increase' },
  { date: '2026-08-20', classification: 'top10_out' },
  { date: '2026-08-01', classification: 'quantity_decrease' },
  { date: '2026-09-11', classification: 'quantity_increase' },
], '2026-09-10');
assert.equal(activity.latestDate, '2026-09-10');
assert.equal(activity.sevenDays.total, 2);
assert.equal(activity.sevenDays.top10New, 1);
assert.equal(activity.thirtyDays.total, 3);
assert.equal(activity.thirtyDays.top10Out, 1);

const otherHoldings = [
  { code: '001', name: '첫 종목', weight: 30 },
  { code: '003', name: '셋째 종목', weight: 15 },
  { code: '005', name: '다섯째 종목', weight: 8 },
];
assert.deepEqual(calculateHoldingSimilarity(analysisHoldings, otherHoldings), {
  commonCodes: ['001', '003'],
  commonCount: 2,
  unionCount: 5,
  jaccardRate: 40,
  weightedOverlap: 40,
});
assert.equal(calculateHoldingSimilarity([], []), null);
assert.deepEqual(
  findSimilarEtfs('A', analysisEtfs, { A: analysisHoldings, B: otherHoldings, C: [analysisHoldings[0]] }, 1),
  [{ code: 'B', name: 'B ETF', commonCodes: ['001', '003'], commonCount: 2, unionCount: 5, jaccardRate: 40, weightedOverlap: 40 }],
);

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
