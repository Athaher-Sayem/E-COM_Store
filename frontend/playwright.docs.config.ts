import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-docs',
  workers: 1,
  outputDir: 'artifacts/docs-results',
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
