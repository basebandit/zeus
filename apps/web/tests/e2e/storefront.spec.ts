import { test, expect } from '@playwright/test'
import { open } from './helpers'

test.describe('storefront (anonymous)', () => {
  test('renders the catalog with products and images', async ({ page }) => {
    await open(page, '/')

    await expect(page.getByRole('heading', { name: /Gear up at Zeus/ })).toBeVisible()

    const cards = page.getByTestId('product-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(20)

    // Every card has an image and an add-to-cart action.
    expect(await page.locator('main img').count()).toBeGreaterThanOrEqual(20)
    expect(await page.getByTestId('product-add').count()).toBeGreaterThanOrEqual(20)
  })

  test('adding to cart while logged out redirects to login', async ({ page }) => {
    await open(page, '/')
    // Retry the click+navigation to absorb client-side nav timing right after load.
    await expect(async () => {
      await page.getByTestId('product-add').first().click()
      await page.waitForURL('**/login', { timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  })
})
