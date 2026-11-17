import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/timeline/', '/domains/cyber/', '/domains/crypto/', '/domains/us-law/', '/domains/global/', '/sources/', '/data-health/', '/scripture/'];

for (const path of PAGES) {
  test.describe(path, () => {
    test('has no WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(path);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} nodes (${v.nodes[0]?.target.join(' ')})`)).toEqual([]);
    });

    test('does not scroll horizontally', async ({ page }) => {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw).toBeLessThanOrEqual(cw);
    });

    test('opens with at most 60 words before its first visual (spec §8)', async ({ page }) => {
      await page.goto(path);
      const words = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const first = main.querySelector('svg, table, figure, img, [aria-label="Key figures"], #search');
        if (!first) return Infinity;
        const range = document.createRange();
        range.setStart(main, 0);
        range.setEndBefore(first);
        return range.toString().split(/\s+/).filter(Boolean).length;
      });
      expect(words).toBeLessThanOrEqual(60);
    });

    test('matches the layout baseline', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${path.replace(/\//g, '_') || 'home'}.png`, {
        fullPage: false,
        // Live numbers and dates change with every refresh; compare layout, not data.
        mask: [page.locator('.num'), page.locator('main svg'), page.locator('article h3'), page.locator('main table')],
      });
    });
  });
}

test('timeline zooms with the keyboard toolbar', async ({ page }) => {
  await page.goto('/timeline/');
  const label = page.locator('[aria-live="polite"]');
  const before = await label.textContent();
  await page.getByRole('button', { name: '1 month' }).click();
  await expect(label).not.toHaveText(before ?? '');
  await expect(label).toContainText('days');
});
