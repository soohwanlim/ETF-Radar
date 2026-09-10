export const SITE_URL = 'https://etf-radar.net';

export function canonicalPath(pathname = '/') {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  return path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
}

export function canonicalUrl(pathname = '/') {
  return `${SITE_URL}${canonicalPath(pathname)}`;
}
