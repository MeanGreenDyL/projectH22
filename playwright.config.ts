import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-regression baselines and accessibility checks against the built site (`pnpm build` first).
 * Baselines live in tests/e2e/__screenshots__. Update them deliberately: `pnpm e2e -- --update-snapshots`.
 * Data-driven pages change daily, so snapshots mask live numbers and compare layout, not data.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  snapshotPathTemplate: 'tests/e2e/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4410', trace: 'off' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  webServer: { command: 'python3 -m http.server 4410 --directory dist', url: 'http://127.0.0.1:4410/', reuseExistingServer: true },
  projects: [
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, colorScheme: 'dark' } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
