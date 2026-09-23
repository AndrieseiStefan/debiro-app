import {defineConfig, devices} from '@playwright/test';
import {viewports} from './e2e/support/viewports';

const baseURL = 'http://localhost:3210';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: viewports.desktop,
    colorScheme: 'light',
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
  webServer: {
    command: 'npm run dev -- --hostname localhost --port 3210',
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
