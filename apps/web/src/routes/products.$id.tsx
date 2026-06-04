import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { addToCart, getProduct } from '../lib/server/fns'
import { formatMoney } from '../lib/format'

export const Route = createFileRoute('/products/$id')({
  loader: async ({ params }) => ({ product: await getProduct({ data: { id: params.id } }) }),
  component: ProductDetail,
})

function ProductDetail() {
  const { product } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)

  const fallback = `https://picsum.photos/seed/${product.id}/800/600`

  async function onAdd() {
    if (!user) {
      router.navigate({ to: '/login' })
      return
    }
    setBusy(true)
    try {
      await addToCart({ data: { productId: product.id, quantity: qty } })
      await router.invalidate()
      setAdded(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← Back to store
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          <img
            src={product.imageUrl || fallback}
            alt={product.name}
            onError={(e) => {
              if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
            }}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          {product.category && (
            <span className="text-xs font-medium uppercase tracking-wide text-indigo-500">
              {product.category}
            </span>
          )}
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-gray-600">{product.description}</p>
          <p className="mt-6 text-2xl font-bold">
            {formatMoney(product.price, product.currency)}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded border border-gray-300 px-2 py-1.5"
            />
            <button
              onClick={onAdd}
              disabled={busy}
              className={`rounded-lg px-4 py-2 font-medium text-white transition disabled:opacity-60 ${
                added ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {added ? 'Added ✓' : busy ? 'Adding…' : 'Add to cart'}
            </button>
          </div>

          {added && (
            <p className="mt-3 text-sm text-gray-600">
              Added to your cart.{' '}
              <Link to="/cart" className="text-indigo-600 hover:underline">
                View cart
              </Link>{' '}
              or keep browsing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
