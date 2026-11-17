/**
 * Phase 7: the generated dist/_headers CSP must allow everything the site runs and nothing else.
 * The test server does not send headers, so the policy is attached to each HTML response here.
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const csp = /Content-Security-Policy: (.+)/.exec(readFileSync('dist/_headers', 'utf8'))?.[1] ?? '';

for (const path of ['/', '/timeline/', '/correlations/', '/preparedness/', '/domains/cyber/']) {
  test(`${path} runs under the generated Content-Security-Policy`, async ({ page }) => {
    expect(csp).toContain("script-src 'self'");
    await page.route('**/*', async (route) => {
      const res = await route.fetch();
      const type = res.headers()['content-type'] ?? '';
      await route.fulfill({ response: res, headers: type.includes('text/html') ? { ...res.headers(), 'content-security-policy': csp.replace('upgrade-insecure-requests', '') } : res.headers() });
    });
    const violations: string[] = [];
    page.on('console', (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    // Islands hydrate (astro-island loses its ssr attribute) and the shared tooltip script ran.
    const state = await page.evaluate(() => ({
      unhydrated: document.querySelectorAll('astro-island[ssr]').length,
      tooltip: !!document.querySelector('.h22-tooltip'),
    }));
    expect(violations).toEqual([]);
    expect(state.tooltip).toBe(true);
    if (path === '/timeline/' || path === '/preparedness/') {
      // client:visible islands hydrate once on screen; scroll each into view (works with touch emulation too).
      for (const island of await page.locator('astro-island').all()) await island.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => document.querySelectorAll('astro-island[ssr]').length), { timeout: 5000 }).toBe(0);
    }
  });
}
