import { test, expect } from '@playwright/test'
import { addProduct, open, registerNewUser } from './helpers'

test('cart quantity stepper and remove behave like a real shop', async ({ page }) => {
  await registerNewUser(page)

  await open(page, '/')
  await addProduct(page, 0, 1) // first product
  await addProduct(page, 1, 2) // second product → two distinct lines, badge 2

  await page.getByTestId('nav-cart').click()
  await page.waitForURL('**/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(2)

  const firstLine = page.getByTestId('cart-item').first()

  await test.step('increment raises the line quantity and badge', async () => {
    await firstLine.getByTestId('qty-increment').click()
    await expect(firstLine.getByTestId('qty-value')).toHaveText('2')
    await expect(page.getByTestId('cart-count')).toHaveText('3') // 2 + 1
  })

  await test.step('decrement lowers it again', async () => {
    await firstLine.getByTestId('qty-decrement').click()
    await expect(firstLine.getByTestId('qty-value')).toHaveText('1')
    await expect(page.getByTestId('cart-count')).toHaveText('2')
  })

  await test.step('decrement is disabled at quantity 1', async () => {
    await expect(firstLine.getByTestId('qty-decrement')).toBeDisabled()
  })

  await test.step('remove deletes the whole line', async () => {
    await firstLine.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('cart-count')).toHaveText('1')
  })
})
