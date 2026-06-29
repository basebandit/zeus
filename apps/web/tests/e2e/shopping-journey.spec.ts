import { test, expect } from '@playwright/test'
import {
  TIMES,
  addProduct,
  open,
  registerNewUser,
  waitForHydration,
  waitForOrderStatus,
} from './helpers'

// The full customer journey, exercised end-to-end through the real saga.
test('register → shop → checkout → fulfilment', async ({ page }) => {
  test.slow() // the order saga + fulfilment span several event hops

  await test.step('register a new shopper', async () => {
    await registerNewUser(page)
  })

  await test.step('add two of the first product and one of the second', async () => {
    await open(page, '/')
    await addProduct(page, 0, 1) // first product → cart total 1
    await addProduct(page, 0, 2) // same product again → 2
    await addProduct(page, 1, 3) // second product → 3
    // Adding never navigates away from the store.
    await expect(page).toHaveURL('/')
  })

  await test.step('cart shows itemised lines with thumbnails', async () => {
    await page.getByTestId('nav-cart').click()
    await page.waitForURL('**/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(2)
    await expect(page.locator('[data-testid="cart-item"] img').first()).toBeVisible()
    // One line has quantity 2 (the product added twice) shown in its stepper.
    await expect(page.getByTestId('qty-value').filter({ hasText: '2' })).toHaveCount(1)
    await expect(page.getByText(/Total:/)).toBeVisible()
  })

  await test.step('checkout with a shipping address', async () => {
    await page.getByRole('link', { name: 'Checkout' }).click()
    await page.waitForURL('**/checkout')
    await page.getByLabel('Street').fill('12 Riverside Dr')
    await page.getByLabel('City').fill('Nairobi')
    await page.getByLabel('State').fill('Nairobi')
    await page.getByLabel(/ZIP/).fill('00100')
    await page.getByLabel('Country').fill('Kenya')
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.waitForURL(/\/orders\/[0-9a-f-]+$/)
  })

  await test.step('order page is an itemised receipt', async () => {
    await expect(page.getByRole('heading', { name: 'Order' })).toBeVisible()
    await expect(page.getByTestId('order-item')).toHaveCount(2)
    await expect(page.locator('[data-testid="order-item"] img').first()).toBeVisible()
    await expect(page.getByText(new RegExp(`${TIMES}\\s*2`))).toBeVisible()
    await expect(page.getByTestId('order-total')).toBeVisible()
  })

  await test.step('saga advances the order to shipped with tracking', async () => {
    await waitForOrderStatus(page, /shipped|delivered/)
    await expect(page.getByText(/Tracking:/)).toBeVisible()
  })

  await test.step('simulate delivery → delivered', async () => {
    await waitForHydration(page) // last status check reloaded the page
    const deliver = page.getByRole('button', { name: /Simulate delivery/ })
    if (await deliver.count()) {
      await deliver.click()
      await waitForOrderStatus(page, /delivered/, 15_000)
    }
    await expect(page.getByTestId('status-badge').first()).toHaveAttribute(
      'data-status',
      'delivered',
    )
  })

  await test.step('checkout cleared the cart and listed exactly one order', async () => {
    // Cart badge is gone (the cart was converted into the order).
    await expect(page.getByTestId('cart-count')).toHaveCount(0)
    await page.getByRole('link', { name: 'Orders', exact: true }).click()
    await page.waitForURL('**/orders')
    await expect(page.getByTestId('order-row')).toHaveCount(1) // no leftover "cart" row
  })
})
