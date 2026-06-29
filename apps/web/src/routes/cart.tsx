import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  getCart,
  getProducts,
  removeFromCart,
  setCartItemQuantity,
} from '../lib/server/fns'
import { formatMoney } from '../lib/format'
import type { Product } from '../lib/types'

export const Route = createFileRoute('/cart')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  // Pull the catalog too so we can show product names/images for cart lines.
  loader: async () => ({ cart: await getCart(), products: await getProducts() }),
  component: CartPage,
})

function CartPage() {
  const { cart, products } = Route.useLoaderData()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const byId = new Map<string, Product>(products.map((p) => [p.id, p]))
  // Stable order so lines don't reshuffle when a quantity changes.
  const items = [...(cart.items ?? [])].sort((a, b) => a.id.localeCompare(b.id))

  async function onSetQty(itemId: string, quantity: number) {
    setBusy(itemId)
    try {
      await setCartItemQuantity({ data: { itemId, quantity } })
      await router.invalidate()
    } finally {
      setBusy(null)
    }
  }

  async function onRemove(itemId: string) {
    setBusy(itemId)
    try {
      await removeFromCart({ data: { itemId } })
      await router.invalidate()
    } finally {
      setBusy(null)
    }
  }

  if (!cart.items?.length) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold">Your cart</h1>
        <p className="text-gray-500">
          Your cart is empty.{' '}
          <Link to="/" className="text-indigo-600 hover:underline">
            Browse products
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {items.map((item) => {
          const product = byId.get(item.productId)
          const fallback = `https://picsum.photos/seed/${item.productId}/120/120`
          const disabled = busy === item.id
          return (
            <div key={item.id} data-testid="cart-item" className="flex items-center gap-4 p-4">
              <img
                src={product?.imageUrl || fallback}
                alt={product?.name ?? 'product'}
                onError={(e) => {
                  if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
                }}
                className="h-16 w-16 flex-none rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{product?.name ?? item.productId}</div>
                <div className="text-sm text-gray-500">{formatMoney(item.unitPrice)} each</div>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center rounded-lg border border-gray-300">
                <button
                  data-testid="qty-decrement"
                  aria-label="Decrease quantity"
                  onClick={() => onSetQty(item.id, item.quantity - 1)}
                  disabled={disabled || item.quantity <= 1}
                  className="px-3 py-1 text-lg leading-none text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  −
                </button>
                <span data-testid="qty-value" className="w-8 text-center text-sm tabular-nums">
                  {item.quantity}
                </span>
                <button
                  data-testid="qty-increment"
                  aria-label="Increase quantity"
                  onClick={() => onSetQty(item.id, item.quantity + 1)}
                  disabled={disabled}
                  className="px-3 py-1 text-lg leading-none text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <div className="w-24 text-right font-semibold">{formatMoney(item.totalPrice)}</div>
              <button
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-xl font-bold">Total: {formatMoney(cart.totalAmount)}</span>
        <Link
          to="/checkout"
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}
