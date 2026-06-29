import { expect, type Page } from '@playwright/test'

/** Multiplication sign used in "unit × qty" lines. */
export const TIMES = '×'

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e5)}@example.com`
}

/** Waits until React has hydrated, so click handlers are attached. */
export async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

/** Navigate to a path and wait for the page to become interactive. */
export async function open(page: Page, path: string) {
  await page.goto(path)
  await waitForHydration(page)
}

/** Registers a brand-new shopper and lands back on the storefront, logged in. */
export async function registerNewUser(page: Page, email = uniqueEmail()): Promise<string> {
  await open(page, '/register')
  await page.getByLabel('Name').fill('E2E Shopper')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForURL('/')
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  return email
}

/** Clicks the Nth product's "Add to cart" and asserts the cart badge total. */
export async function addProduct(page: Page, index: number, expectedCount: number) {
  await page.getByTestId('product-add').nth(index).click()
  await expect(page.getByTestId('cart-count')).toHaveText(String(expectedCount))
}

/**
 * Waits for the order status to reach a target state WITHOUT reloading — the
 * order page polls itself, so this asserts the real-time auto-refresh works.
 */
export async function waitForOrderStatus(page: Page, pattern: RegExp, timeout = 60_000) {
  await expect
    .poll(
      async () => (await page.getByTestId('status-badge').first().getAttribute('data-status')) ?? '',
      { timeout, intervals: [1000] },
    )
    .toMatch(pattern)
}
