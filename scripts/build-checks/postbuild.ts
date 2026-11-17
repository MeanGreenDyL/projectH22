/**
 * Runs after `astro build` and Pagefind. Writes dist/_headers (security headers with a CSP that
 * allows exactly the inline scripts the build emitted, by hash) and, when SITE_URL is set,
 * dist/sitemap.xml and dist/robots.txt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { contentSecurityPolicy, cspHash, headersFile, inlineScripts, sitemapXml, walk } from './lib';

const DIST = 'dist';
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const hashes = pages.flatMap((f) => inlineScripts(readFileSync(f, 'utf8')).map(cspHash));
writeFileSync(`${DIST}/_headers`, headersFile(contentSecurityPolicy(hashes)));
console.log(`postbuild: _headers written (${new Set(hashes).size} inline script hashes across ${pages.length} pages)`);

const site = process.env.SITE_URL;
if (site) {
  const paths = pages
    .map((f) => '/' + relative(DIST, f).split(sep).join('/'))
    .filter((p) => p.endsWith('/index.html') && !p.startsWith('/pagefind/'))
    .map((p) => p.replace(/index\.html$/, ''));
  writeFileSync(`${DIST}/sitemap.xml`, sitemapXml(site, paths));
  writeFileSync(`${DIST}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${site.replace(/\/+$/, '')}/sitemap.xml\n`);
  console.log(`postbuild: sitemap.xml with ${paths.length} URLs`);
} else {
  console.log('postbuild: SITE_URL not set; sitemap.xml and robots.txt skipped (the site address is decided at deploy)');
}
