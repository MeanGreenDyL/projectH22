/** Phase 7 post-build helpers: CSP hashing, internal link resolution, sitemap. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { candidates, contentSecurityPolicy, cspHash, headersFile, inlineScripts, internalTargets, sitemapXml } from '../scripts/dist/lib';

describe('inline scripts and CSP', () => {
  it('collects executable inline scripts only', () => {
    const html = '<script>a()</script><script type="module">b()</script><script src="/x.js"></script><script type="application/ld+json">{"x":1}</script>';
    expect(inlineScripts(html)).toEqual(['a()', 'b()']);
  });
  it('hashes exactly as browsers do', () => {
    expect(cspHash('a()')).toBe(`'sha256-${createHash('sha256').update('a()').digest('base64')}'`);
  });
  it('allows only self plus hashes, and blocks framing and plugins', () => {
    const csp = contentSecurityPolicy([cspHash('a()'), cspHash('a()')]);
    expect(csp.match(/sha256-/g)).toHaveLength(1);
    expect(csp).not.toContain("'unsafe-inline' 'sha");
    expect(csp).toMatch(/script-src 'self'[^;]*sha256/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(headersFile(csp)).toMatch(/^\/\*\n {2}Content-Security-Policy: /);
  });
});

describe('internal links', () => {
  it('skips external, protocol and fragment links; resolves relative ones', () => {
    const html = '<a href="https://x.org/">x</a><a href="mailto:a@b">m</a><a href="#top">t</a><a href="/sources/?q=1#a">s</a><a href="../cyber/">c</a><img src="/img.png">';
    expect(internalTargets(html, '/domains/us-law/index.html')).toEqual(['/sources/', '/domains/cyber/', '/img.png']);
  });
  it('maps URL paths to dist files', () => {
    expect(candidates('/')).toEqual(['index.html']);
    expect(candidates('/sources/')).toEqual(['sources/index.html']);
    expect(candidates('/a.css')).toEqual(['a.css', 'a.css/index.html', 'a.css.html']);
  });
});

describe('sitemap', () => {
  it('writes absolute, sorted, escaped URLs', () => {
    const xml = sitemapXml('https://example.org/', ['/b/', '/', '/a&b/']);
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual(['<loc>https://example.org/</loc>', '<loc>https://example.org/a&amp;b/</loc>', '<loc>https://example.org/b/</loc>']);
  });
});

describe('source link targets', async () => {
  const { linkTargets } = await import('../scripts/dist/source-links');
  it('checks the live URL and, when present, the archive copy', () => {
    expect(linkTargets([{ id: 'a', url: 'https://a.gov/', archiveUrl: 'https://web.archive.org/x' }, { id: 'b', url: 'https://b.org/' }]).map((t) => `${t.id}:${t.kind}`)).toEqual(['a:live', 'a:archive', 'b:live']);
  });
});
