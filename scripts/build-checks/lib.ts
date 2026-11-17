/** Helpers for post-build checks over dist/. Pure where possible so tests can drive them. */
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';

export function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Inline executable scripts (not JSON-LD or other data blocks), in document order. */
export function inlineScripts(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] ?? '';
    if (/\ssrc\s*=/.test(attrs)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && type !== 'module' && type !== 'text/javascript' && type !== 'application/javascript') continue;
    out.push(m[2] ?? '');
  }
  return out;
}

export const cspHash = (body: string) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

export function contentSecurityPolicy(scriptHashes: readonly string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${[...new Set(scriptHashes)].sort().join(' ')}`.trim(),
    // SVG charts use style attributes for theme tokens; no external styles are loaded.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Netlify and Cloudflare Pages both read this `_headers` format. */
export function headersFile(csp: string): string {
  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  X-Frame-Options: DENY',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '/_astro/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
}

/** Internal href/src targets in an HTML page (absolute-path or relative), without query or hash. */
export function internalTargets(html: string, pagePath: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/\s(?:href|src)\s*=\s*"([^"]*)"/gi)) {
    const raw = (m[1] ?? '').replace(/&amp;/g, '&');
    if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) continue;
    const clean = raw.split(/[?#]/)[0] ?? '';
    if (!clean) continue;
    out.push(clean.startsWith('/') ? clean : posix.join(posix.dirname(pagePath), clean));
  }
  return out;
}

/** dist-relative candidates a URL path may be served from. */
export function candidates(urlPath: string): string[] {
  const p = decodeURIComponent(urlPath).replace(/^\/+/, '');
  if (p === '' ) return ['index.html'];
  if (p.endsWith('/')) return [`${p}index.html`];
  return [p, `${p}/index.html`, `${p}.html`];
}

export function sitemapXml(site: string, paths: readonly string[]): string {
  const base = site.replace(/\/+$/, '');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths].sort().map((p) => `  <url><loc>${esc(base + p)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
