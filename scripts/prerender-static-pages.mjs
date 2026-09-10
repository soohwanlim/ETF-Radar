import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSIGHT_ARTICLES } from '../src/data/insightArticles.js';
import {
  calculateChangeActivity,
  calculateHoldingConcentration,
  calculateReturnRanks,
  findSimilarEtfs,
} from '../src/data/etfAnalysis.js';
import { selectIndexableEtfs } from '../src/data/etfIndexing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://etf-radar.net';
const START_MARKER = '<!-- prerender:start -->';
const END_MARKER = '<!-- prerender:end -->';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function replaceMetaContent(html, identifier, value) {
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagPattern = new RegExp(`<meta\\s+[^>]*${escapedIdentifier}[^>]*>`, 'm');
  const match = html.match(tagPattern);
  assert.ok(match, `Missing meta ${identifier}`);
  const updated = match[0].replace(/content="[^"]*"/, `content="${escapeHtml(value)}"`);
  assert.notEqual(updated, match[0], `Missing content attribute for meta ${identifier}`);
  return html.replace(match[0], updated);
}

function pageShell(content) {
  return `<div class="prerender-page">
    <style>
      .prerender-page{min-height:100vh;overflow-x:hidden;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .prerender-header{border-bottom:1px solid #e2e8f0;background:#fff}.prerender-nav,.prerender-main{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;padding:20px}
      .prerender-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-weight:800}.prerender-nav a{color:#2563eb;text-decoration:none}
      .prerender-main{padding-top:40px;padding-bottom:64px}.prerender-card{box-sizing:border-box;width:100%;max-width:100%;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:24px;background:#fff;padding:28px}
      .prerender-page h1{margin:8px 0 16px;overflow-wrap:anywhere;font-size:clamp(30px,6vw,46px);line-height:1.2}.prerender-page h2{margin:32px 0 12px;overflow-wrap:anywhere;font-size:23px}
      .prerender-page p,.prerender-page li{font-size:15px;line-height:1.9;color:#475569}.prerender-page ul{padding-left:22px}.prerender-meta{font-size:13px;color:#64748b}
      .prerender-kicker{color:#2563eb!important;font-weight:800}.prerender-link{display:block;margin-top:14px;color:#2563eb;font-weight:800;text-decoration:none}
      @media(max-width:600px){.prerender-main{padding-top:24px}.prerender-card{padding:22px;border-radius:20px}.prerender-page h1{font-size:30px}}
    </style>
    <header class="prerender-header"><nav class="prerender-nav"><a href="/">ETF Radar</a><a href="/insights">ETF 인사이트</a></nav></header>
    <main class="prerender-main">${content}</main>
  </div>`;
}

function articleHtml(article) {
  const sections = article.sections.map(section => `<section>
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
  </section>`).join('\n');
  const checklist = article.checklist.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const related = article.relatedLinks.map(link => `<a class="prerender-link" href="${escapeHtml(link.to)}">${escapeHtml(link.label)}</a>`).join('');

  return pageShell(`<article>
    <header class="prerender-card">
      <p class="prerender-kicker">${escapeHtml(article.category)}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p>${escapeHtml(article.summary)}</p>
      <p class="prerender-meta">최초 작성 ${escapeHtml(article.publishedAt)} · 최종 수정 ${escapeHtml(article.updatedAt)} · 약 ${article.readingMinutes}분</p>
    </header>
    <div class="prerender-card">${sections}</div>
    <section class="prerender-card"><h2>확인 체크리스트</h2><ul>${checklist}</ul></section>
    <section class="prerender-card"><h2>투자 유의사항</h2><p>이 글은 공개된 ETF 데이터를 해석하는 일반적인 방법을 설명하며 특정 상품이나 종목의 매수·매도를 권유하지 않습니다. 중요한 판단에는 운용사 공식 자료를 함께 사용하세요.</p>${related}</section>
  </article>`);
}

function collectionHtml() {
  const cards = INSIGHT_ARTICLES.map(article => `<article class="prerender-card">
    <p class="prerender-kicker">${escapeHtml(article.category)}</p>
    <h2>${escapeHtml(article.title)}</h2>
    <p>${escapeHtml(article.summary)}</p>
    <a class="prerender-link" href="/insights/${escapeHtml(article.slug)}">전문 읽기</a>
  </article>`).join('\n');
  return pageShell(`<header class="prerender-card"><p class="prerender-kicker">ETF 해석 노트</p><h1>ETF Radar 인사이트</h1><p>ETF 수익률과 구성종목 변화의 계산 범위, 올바른 해석 순서와 한계를 주제별 독립 문서로 정리했습니다.</p></header>${cards}`);
}

function formatRate(value) {
  return Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '-';
}

function etfHtml(etf, holdings, analysis) {
  const rankItems = ['1m', '3m', '1y'].map(period => {
    const labels = { '1m': '1개월', '3m': '3개월', '1y': '1년' };
    const rank = analysis.ranks[period];
    return `<li><strong>${labels[period]} ${escapeHtml(formatRate(rank?.rate))}</strong>${rank ? ` · 비교 가능 ETF ${rank.total}개 중 ${rank.rank}위` : ' · 비교 데이터 없음'}</li>`;
  }).join('');
  const holdingItems = holdings.slice(0, 10).map(holding => `<li><a href="/holding/${escapeHtml(holding.code)}">${escapeHtml(holding.name)}</a> ${escapeHtml(holding.weight)}%</li>`).join('');
  const similarItems = analysis.similarEtfs.map(item => `<li><a href="/etf/${escapeHtml(item.code)}">${escapeHtml(item.name)}</a> · 공통 ${item.commonCount}개 · 비중 중첩 ${item.weightedOverlap}%</li>`).join('');
  const concentration = analysis.concentration;
  const activity = analysis.activity;

  return pageShell(`<article>
    <header class="prerender-card"><p class="prerender-kicker">국내 ETF 분석</p><h1>${escapeHtml(etf.name)} 수익률·구성종목 분석</h1><p>${escapeHtml(etf.description)}</p><p class="prerender-meta">종목코드 ${escapeHtml(etf.code)} · ${escapeHtml(etf.provider)} · 기준일 ${escapeHtml(etf.asOf)}</p></header>
    <section class="prerender-card"><h2>기간 수익률과 전체 ETF 내 위치</h2><ul>${rankItems}</ul><p>기간 순위는 같은 기준일에 해당 수익률 데이터가 있는 국내 주식형 현물 ETF끼리 비교한 ETF Radar 자체 계산 결과입니다.</p></section>
    <section class="prerender-card"><h2>공개 TOP 10 구성 특징</h2>${concentration ? `<p>가장 비중이 높은 종목은 <a href="/holding/${escapeHtml(concentration.topHolding.code)}">${escapeHtml(concentration.topHolding.name)}</a> ${concentration.topHolding.weight}%입니다. 상위 3개 종목 합계는 ${concentration.top3Weight}%, 공개 TOP 10 합계는 ${concentration.top10Weight}%입니다.</p>` : ''}<ol>${holdingItems}</ol></section>
    <section class="prerender-card"><h2>최근 구성종목 변화</h2><p>기준일 현재 최근 7일 ${activity?.sevenDays.total || 0}건, 최근 30일 ${activity?.thirtyDays.total || 0}건의 TOP 10 또는 1CU당 구성수량 변화가 감지됐습니다. 최근 30일 TOP 10 진입·이탈은 ${(activity?.thirtyDays.top10New || 0) + (activity?.thirtyDays.top10Out || 0)}건입니다.</p><a class="prerender-link" href="/changes">전체 변경 감지 보기</a></section>
    <section class="prerender-card"><h2>TOP 10이 비슷한 ETF</h2>${similarItems ? `<ul>${similarItems}</ul>` : '<p>현재 비교 가능한 유사 ETF가 없습니다.</p>'}</section>
    <section class="prerender-card"><h2>데이터 범위와 투자 유의사항</h2><p>가격과 수익률은 실시간 시세가 아닌 ${escapeHtml(etf.asOf)} 종가 기준입니다. 구성 분석은 네이버 금융에 공개된 전일 기준 TOP 10 구성자산 범위이며 전체 포트폴리오 분석이 아닙니다. 이 정보는 투자 추천이 아니며 실제 판단에는 KRX와 운용사 공식 자료를 함께 확인해야 합니다.</p></section>
  </article>`);
}

function etfStructuredData(etf) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${etf.name} 수익률·구성종목 분석`,
    description: `${etf.name}의 기간 수익률 순위, TOP 10 구성 집중도, 최근 구성 변화와 유사 ETF를 확인합니다.`,
    dateModified: etf.asOf,
    inLanguage: 'ko-KR',
    url: `${SITE_URL}/etf/${etf.code}`,
    isPartOf: { '@type': 'WebSite', name: 'ETF Radar', url: SITE_URL },
  };
}

function structuredData(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: 'ko-KR',
    mainEntityOfPage: `${SITE_URL}/insights/${article.slug}`,
    author: { '@type': 'Organization', name: 'ETF Radar', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'ETF Radar', url: SITE_URL },
  };
}

function renderDocument(template, { title, description, pathname, body, schema }) {
  assert.ok(template.includes(START_MARKER) && template.includes(END_MARKER), 'Prerender markers are missing');
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceMetaContent(html, 'name="description"', description);
  html = replaceMetaContent(html, 'property="og:title"', title);
  html = replaceMetaContent(html, 'property="og:description"', description);
  html = replaceMetaContent(html, 'property="og:url"', `${SITE_URL}${pathname}`);
  html = replaceMetaContent(html, 'name="twitter:title"', title);
  html = replaceMetaContent(html, 'name="twitter:description"', description);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${SITE_URL}${pathname}" />`);
  html = html.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, '');
  html = html.replace(new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`), `${START_MARKER}${body}${END_MARKER}`);
  if (schema) {
    const json = JSON.stringify(schema).replaceAll('<', '\\u003c');
    html = html.replace('</head>', `    <script type="application/ld+json" data-prerendered>${json}</script>\n  </head>`);
  }
  return html;
}

async function writePage(template, pathname, options) {
  const output = path.join(DIST, pathname.replace(/^\//, ''), 'index.html');
  const html = renderDocument(template, { ...options, pathname });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  return { output, html };
}

const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
const [etfs, holdingsByCode, changes] = await Promise.all([
  readFile(path.join(ROOT, 'public', 'data', 'etfs.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public', 'data', 'holdings.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public', 'data', 'changes', 'history.json'), 'utf8').then(JSON.parse),
]);
const changesByCode = new Map();
for (const change of changes) {
  if (!changesByCode.has(change.code)) changesByCode.set(change.code, []);
  changesByCode.get(change.code).push(change);
}
const generated = [];
generated.push(await writePage(template, '/insights', {
  title: 'ETF Radar 인사이트 | ETF 구성종목 변화와 액티브 ETF 해석',
  description: 'ETF TOP 10 구성종목 변화, 1CU당 구성수량 변화, 액티브 ETF 공통 증가 종목을 읽는 독립 해설을 확인합니다.',
  body: collectionHtml(),
}));

for (const article of INSIGHT_ARTICLES) {
  generated.push(await writePage(template, `/insights/${article.slug}`, {
    title: `${article.title} | ETF Radar`,
    description: article.description,
    body: articleHtml(article),
    schema: structuredData(article),
  }));
}

const insightPageCount = generated.length;
assert.equal(insightPageCount, INSIGHT_ARTICLES.length + 1);
for (const { html } of generated) {
  assert.doesNotMatch(html, /class="initial-shell"/);
  assert.match(html, /<main class="prerender-main">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/etf-radar\.net\/insights/);
}

const indexableEtfs = selectIndexableEtfs(etfs, holdingsByCode);
for (const etf of indexableEtfs) {
  const holdings = holdingsByCode[etf.code] || [];
  const analysis = {
    ranks: calculateReturnRanks(etfs, etf.code),
    concentration: calculateHoldingConcentration(holdings),
    activity: calculateChangeActivity(changesByCode.get(etf.code) || [], etf.asOf),
    similarEtfs: findSimilarEtfs(etf.code, etfs, holdingsByCode, 3),
  };
  generated.push(await writePage(template, `/etf/${etf.code}`, {
    title: `${etf.name} 수익률·구성종목 분석 | ETF Radar`,
    description: `${etf.name}의 기간 수익률 순위, TOP 10 구성 집중도, 최근 구성종목 변화와 비슷한 국내 ETF를 ${etf.asOf} 종가 기준으로 확인합니다.`,
    body: etfHtml(etf, holdings, analysis),
    schema: etfStructuredData(etf),
  }));
}

assert.equal(generated.length, insightPageCount + indexableEtfs.length);
assert.equal(new Set(generated.map(page => page.html.match(/<title>([^<]+)<\/title>/)?.[1])).size, generated.length);
for (const etf of indexableEtfs) {
  const file = generated.find(page => page.output.endsWith(`/etf/${etf.code}/index.html`));
  assert.ok(file, `Missing ETF prerender: ${etf.code}`);
  assert.match(file.html, new RegExp(`<link rel="canonical" href="${SITE_URL}/etf/${etf.code}"`));
  assert.match(file.html, /기간 수익률과 전체 ETF 내 위치/);
  assert.match(file.html, /공개 TOP 10 구성 특징/);
}

console.log(`Prerendered ${insightPageCount} insight pages and ${indexableEtfs.length} ETF pages`);
