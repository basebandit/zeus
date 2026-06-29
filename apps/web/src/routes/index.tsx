import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { addToCart, getProducts } from '../lib/server/fns'
import { ProductCard } from '../components/ProductCard'
import type { Product } from '../lib/types'

export const Route = createFileRoute('/')({
  loader: async () => ({ products: await getProducts() }),
  component: Home,
})

function Home() {
  const { products } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function onAdd(product: Product) {
    if (!user) {
      router.navigate({ to: '/login' })
      return
    }
    setBusy(product.id)
    try {
      await addToCart({ data: { productId: product.id, quantity: 1 } })
      // Refresh the cart-count badge in the nav, but stay on the store.
      await router.invalidate()
      setAdded(product.id)
      if (addedTimer.current) clearTimeout(addedTimer.current)
      addedTimer.current = setTimeout(() => setAdded(null), 1500)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-12 text-white">
        <h1 className="text-4xl font-bold tracking-tight">Gear up at Zeus ⚡</h1>
        <p className="mt-3 max-w-xl text-indigo-100">
          A small, fast, event-driven shop. Add things to your cart and keep browsing —
          your order flows through inventory, payments, and shipping in real time.
        </p>
      </section>

      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <span className="text-sm text-gray-500">{products.length} items</span>
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No products yet. Seed the catalog with{' '}
          <code className="rounded bg-gray-100 px-1">apps/inventory/seed-products.sh</code>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              busy={busy === product.id}
              added={added === product.id}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
