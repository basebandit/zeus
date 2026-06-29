import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createOrder, getCart } from '../lib/server/fns'
import { formatMoney } from '../lib/format'
import type { ShippingAddress } from '../lib/types'

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: async () => ({ cart: await getCart() }),
  component: CheckoutPage,
})

const EMPTY: ShippingAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
}

function CheckoutPage() {
  const { cart } = Route.useLoaderData()
  const router = useRouter()
  const [address, setAddress] = useState<ShippingAddress>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function update(field: keyof ShippingAddress, value: string) {
    setAddress((a) => ({ ...a, [field]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const order = await createOrder({ data: { shippingAddress: address } })
      // The cart was converted into the order; refresh the badge before leaving.
      await router.invalidate()
      router.navigate({ to: '/orders/$id', params: { id: order.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      <p className="mb-4 text-gray-600">
        Order total: <span className="font-bold">{formatMoney(cart.totalAmount)}</span>
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        {(
          [
            ['street', 'Street'],
            ['city', 'City'],
            ['state', 'State'],
            ['zipCode', 'ZIP / Postal code'],
            ['country', 'Country'],
          ] as Array<[keyof ShippingAddress, string]>
        ).map(([field, label]) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input
              aria-label={label}
              required
              value={address[field]}
              onChange={(e) => update(field, e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </div>
  )
}
