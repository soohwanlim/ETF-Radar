import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSIGHT_ARTICLES } from '../src/data/insightArticles.js';
import { meetsEtfSearchQuality } from '../src/data/etfSearchQuality.js';
import { canonicalUrl } from '../src/data/siteUrls.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const PUBLIC_ROUTES = [
  { pathname: '/', changefreq: 'daily', priority: '1.0' },
  { pathname: '/theme/', changefreq: 'daily', priority: '0.8', prerendered: true },
  { pathname: '/active/', changefreq: 'daily', priority: '0.8', prerendered: true },
  { pathname: '/changes/', changefreq: 'daily', priority: '0.8', prerendered: true },
  { pathname: '/about/', changefreq: 'monthly', priority: '0.6', prerendered: true },
  { pathname: '/guide/', changefreq: 'monthly', priority: '0.7', prerendered: true },
  { pathname: '/methodology/', changefreq: 'monthly', priority: '0.7', prerendered: true },
  { pathname: '/insights/', changefreq: 'weekly', priority: '0.8', prerendered: true },
  { pathname: '/faq/', changefreq: 'monthly', priority: '0.6', prerendered: true },
  { pathname: '/contact/', changefreq: 'monthly', priority: '0.5', prerendered: true },
  { pathname: '/policy/', changefreq: 'monthly', priority: '0.4', prerendered: true },
];

const insightRoutes = INSIGHT_ARTICLES.map(article => ({
  pathname: `/insights/${article.slug}/`,
  changefreq: 'monthly',
  priority: '0.7',
  lastmod: article.updatedAt,
  prerendered: true,
}));

const [etfs, holdingsByCode] = await Promise.all([
  readFile(path.join(ROOT, 'public/data/etfs.json'), 'utf8').then(JSON.parse),
  readFile(path.join(ROOT, 'public/data/holdings.json'), 'utf8').then(JSON.parse),
]);
const etfRoutes = etfs
  .filter(etf => meetsEtfSearchQuality(etf, holdingsByCode[etf.code]))
  .map(etf => ({
    pathname: `/etf/${etf.code}/`,
    changefreq: 'daily',
    priority: '0.7',
    lastmod: etf.asOf,
    prerendered: true,
  }));

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderUrl(route) {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(canonicalUrl(route.pathname))}</loc>`,
  ];
  if (route.lastmod) lines.push(`    <lastmod>${escapeXml(route.lastmod)}</lastmod>`);
  lines.push(`    <changefreq>${route.changefreq}</changefreq>`);
  lines.push(`    <priority>${route.priority}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
}

async function assertPrerendered(route) {
  if (!route.prerendered) return;
  const file = path.join(DIST, route.pathname.replace(/^\//, ''), 'index.html');
  await access(file);
  const html = await readFile(file, 'utf8');
  assert.match(html, /<main class="prerender-main">/, `Missing prerendered body: ${route.pathname}`);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl(route.pathname)}"`), `Canonical mismatch: ${route.pathname}`);
}

const routes = [...PUBLIC_ROUTES, ...insightRoutes, ...etfRoutes];
const pathnames = routes.map(route => route.pathname);
assert.equal(new Set(pathnames).size, pathnames.length, 'Sitemap paths must be unique');
assert.ok(!pathnames.includes('/compare'), 'Empty compare state must not be indexed');
assert.ok(!pathnames.includes('/watchlist'), 'Personal watchlist must not be indexed');
assert.ok(pathnames.every(pathname => pathname.endsWith('/')), 'Canonical paths must use Cloudflare Pages trailing slashes');
await Promise.all(routes.map(assertPrerendered));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(renderUrl),
  '</urlset>',
  '',
].join('\n');

assert.equal((sitemap.match(/<url>/g) || []).length, routes.length);
assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length);

await Promise.all([
  writeFile(path.join(ROOT, 'public', 'sitemap.xml'), sitemap),
  writeFile(path.join(DIST, 'sitemap.xml'), sitemap),
]);

console.log(`Generated sitemap with ${routes.length} canonical URLs`);
