import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? path.join(DIST, 'index.html') : path.join(DIST, pathname.slice(1), 'index.html');
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
  } catch {
    const body = await readFile(path.join(DIST, '404.html'));
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(body);
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

assert.ok(urls.length > 1, 'Sitemap must contain public URLs');
assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique');

for (const value of urls) {
  const url = new URL(value);
  assert.equal(url.origin, 'https://etf-radar.net');
  assert.ok(url.pathname.endsWith('/'), `Final URL must have a trailing slash: ${value}`);
  const file = url.pathname === '/'
    ? path.join(DIST, 'index.html')
    : path.join(DIST, url.pathname.slice(1), 'index.html');
  const html = await readFile(file, 'utf8');
  assert.match(html, /<meta name="robots" content="index, follow"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  const response = await fetch(`http://127.0.0.1:${port}${url.pathname}`, { redirect: 'manual' });
  assert.equal(response.status, 200, `Sitemap URL must return 200 without a redirect: ${value}`);
}

const notFound = await readFile(path.join(DIST, '404.html'), 'utf8');
assert.match(notFound, /<meta name="robots" content="noindex, follow"/);
assert.doesNotMatch(sitemap, /unknown|not-found/);
for (const pathname of ['/insights/not-a-real-article/', '/etf/NOTETF/']) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { redirect: 'manual' });
  assert.equal(response.status, 404);
  assert.match(await response.text(), /<meta name="robots" content="noindex, follow"/);
}
await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

console.log(`Verified ${urls.length} final 200 sitemap URLs, non-redirecting canonicals, and the noindex 404 page`);
