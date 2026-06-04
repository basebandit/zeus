import { Link } from '@tanstack/react-router'
import { formatMoney } from '../lib/format'
import type { Product } from '../lib/types'

interface Props {
  product: Product
  busy: boolean
  added: boolean
  onAdd: (product: Product) => void
}

export function ProductCard({ product, busy, added, onAdd }: Props) {
  // Deterministic placeholder if the product has no image or the URL fails to load.
  const fallback = `https://picsum.photos/seed/${product.id}/600/450`

  return (
    <div
      data-testid="product-card"
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="block aspect-[4/3] overflow-hidden bg-gray-100"
      >
        <img
          src={product.imageUrl || fallback}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
          }}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-500">
            {product.category}
          </span>
        )}
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="font-semibold leading-snug hover:text-indigo-600"
        >
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold">
            {formatMoney(product.price, product.currency)}
          </span>
          <button
            data-testid="product-add"
            onClick={() => onAdd(product)}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${
              added ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {added ? 'Added ✓' : busy ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
