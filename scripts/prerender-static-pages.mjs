import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSIGHT_ARTICLES } from '../src/data/insightArticles.js';
import { getEtfMeta, meetsEtfSearchQuality } from '../src/data/etfSearchQuality.js';
import {
  calculateHoldingAnalysis,
  getHoldingChanges,
  getHoldingMeta,
  isLinkableHolding,
  meetsHoldingSearchQuality,
} from '../src/data/holdingSearchQuality.js';

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

function etfHtml(etf, holdings) {
  const topHoldings = holdings.slice(0, 10).map(holding => {
    const label = `${escapeHtml(holding.name)}${Number.isFinite(holding.weight) ? ` ${escapeHtml(holding.weight)}%` : ''}`;
    return `<li>${isLinkableHolding(holding) ? `<a href="/holding/${escapeHtml(holding.code)}">${label}</a>` : label}</li>`;
  }).join('');
  const rates = [['1개월', etf.rate1m], ['3개월', etf.rate3m], ['1년', etf.rate1y]]
    .filter(([, value]) => Number.isFinite(value))
    .map(([label, value]) => `<li>${label} 수익률 ${value >= 0 ? '+' : ''}${escapeHtml(value)}%</li>`).join('');
  return pageShell(`<article>
    <header class="prerender-card"><p class="prerender-kicker">국내 ETF 상세</p><h1>${escapeHtml(etf.name)} (${escapeHtml(etf.code)})</h1><p>${escapeHtml(etf.description)}</p><p class="prerender-meta">기준일 ${escapeHtml(etf.asOf)} · ${escapeHtml(etf.provider)}</p></header>
    <section class="prerender-card"><h2>기간별 수익률</h2><ul>${rates}</ul></section>
    <section class="prerender-card"><h2>TOP 10 구성종목</h2><ul>${topHoldings}</ul><a class="prerender-link" href="/etf/${escapeHtml(etf.code)}">최신 상세 분석 보기</a></section>
  </article>`);
}

function holdingHtml(holding, changes) {
  const analysis = calculateHoldingAnalysis(holding, changes);
  const topEtfs = analysis.topEtfs.map(etf => `<li><a href="/etf/${escapeHtml(etf.code)}">${escapeHtml(etf.name)}</a> ${escapeHtml(etf.weight)}%</li>`).join('');
  const topThemes = (holding.themes || []).filter(theme => theme.id !== 'etc').slice(0, 5)
    .map(theme => `<li>${escapeHtml(theme.name)} ${escapeHtml(theme.count)}개 ETF</li>`).join('');
  return pageShell(`<article>
    <header class="prerender-card"><p class="prerender-kicker">ETF 구성종목 상세</p><h1>${escapeHtml(holding.name)} (${escapeHtml(holding.code)})</h1><p>이 종목을 공개된 TOP 10 구성자산으로 보유한 국내 주식형 현물 ETF를 분석합니다.</p><p class="prerender-meta">기준일 ${escapeHtml(holding.asOf)} · 네이버 금융 TOP 10 기준</p></header>
    <section class="prerender-card"><h2>ETF 보유 현황</h2><p>보유 ETF ${escapeHtml(holding.etfCount)}개 · 액티브 ETF ${escapeHtml(holding.activeEtfCount)}개 · ETF별 TOP 10 비중 합계 ${escapeHtml(analysis.totalTop10Weight)}%</p><ul>${topEtfs}</ul></section>
    ${topThemes ? `<section class="prerender-card"><h2>관련 ETF 테마</h2><ul>${topThemes}</ul></section>` : ''}
    <section class="prerender-card"><h2>최근 구성 변화</h2><p>최근 기록 ${escapeHtml(analysis.changeCount)}건 · 진입 ${escapeHtml(analysis.entries)}건 · 이탈 ${escapeHtml(analysis.exits)}건 · 수량 증가 ${escapeHtml(analysis.increases)}건 · 수량 감소 ${escapeHtml(analysis.decreases)}건</p></section>
    <section class="prerender-card"><h2>데이터 해석 유의사항</h2><p>표시값은 ETF 전체 포트폴리오가 아닌 공개된 TOP 10 구성자산 기준이며 투자 추천이 아닙니다.</p></section>
  </article>`);
}

function etfStructuredData(etf) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: etf.name,
    description: etf.description,
    identifier: etf.code,
    url: `${SITE_URL}/etf/${etf.code}`,
    provider: { '@type': 'Organization', name: etf.provider },
  };
}

function holdingStructuredData(holding) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${holding.name} 보유 ETF 분석`,
    description: `${holding.name}을 TOP 10 구성자산으로 보유한 ETF와 최근 구성 변화를 확인합니다.`,
    url: `${SITE_URL}/holding/${holding.code}`,
    dateModified: holding.asOf,
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
  const output = path.join(DIST, `${pathname.replace(/^\//, '')}.html`);
  const html = renderDocument(template, { ...options, pathname });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  return { output, html };
}

const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
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

const [etfs, holdingsByCode, holdingIndex, changeHistory] = await Promise.all([
  readFile(path.join(ROOT, 'public/data/etfs.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public/data/holdings.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public/data/holding-index.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public/data/changes/history.json'), 'utf8').then(JSON.parse),
]);
const searchableEtfs = etfs.filter(etf => meetsEtfSearchQuality(etf, holdingsByCode[etf.code]));
for (const etf of searchableEtfs) {
  const meta = getEtfMeta(etf, true);
  generated.push(await writePage(template, `/etf/${etf.code}`, {
    title: meta.title,
    description: meta.description,
    body: etfHtml(etf, holdingsByCode[etf.code]),
    schema: etfStructuredData(etf),
  }));
}

const changesByHolding = new Map();
for (const change of changeHistory) {
  if (!changesByHolding.has(change.holdingCode)) changesByHolding.set(change.holdingCode, []);
  changesByHolding.get(change.holdingCode).push(change);
}
const searchableHoldings = holdingIndex.items
  .map(holding => ({ ...holding, asOf: holdingIndex.asOf, coverage: holdingIndex.coverage }))
  .filter(holding => meetsHoldingSearchQuality(holding, changesByHolding.get(holding.code) || []));
for (const holding of searchableHoldings) {
  const changes = getHoldingChanges(changeHistory, holding.code);
  const meta = getHoldingMeta(holding, true);
  generated.push(await writePage(template, `/holding/${holding.code}`, {
    title: meta.title,
    description: meta.description,
    body: holdingHtml(holding, changes),
    schema: holdingStructuredData(holding),
  }));
}

assert.equal(generated.length, INSIGHT_ARTICLES.length + 1 + searchableEtfs.length + searchableHoldings.length);
assert.equal(new Set(generated.map(page => page.html.match(/<title>([^<]+)<\/title>/)?.[1])).size, generated.length);
for (const { html } of generated) {
  assert.doesNotMatch(html, /class="initial-shell"/);
  assert.match(html, /<main class="prerender-main">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/etf-radar\.net\/(?:insights|etf\/|holding\/)/);
}

console.log(`Prerendered ${INSIGHT_ARTICLES.length + 1} insight, ${searchableEtfs.length} ETF, and ${searchableHoldings.length} holding pages`);
