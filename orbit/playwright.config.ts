import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, timeout: 45000,
  reporter: [['list'], ['json', { outputFile: 'qa/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, trace: 'retain-on-failure' }
});
