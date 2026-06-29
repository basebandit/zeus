import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests for the Zeus storefront.
 *
 * These drive the real UI against a running stack, so before running them start
 * the backend + web and seed the catalog:
 *
 *   docker compose up --build            # from the repo root
 *   ./apps/inventory/seed-products.sh    # seed the demo catalog
 *   cd apps/web && npm run test:e2e
 *
 * Point at a different environment with PLAYWRIGHT_BASE_URL.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  // The whole suite drives one shared backend + a single Vite dev server, so run
  // serially to avoid contention (a parallel run can overload SSR and time out).
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
