import { useEffect, useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { deliverShipment, getOrder, getProducts } from '../lib/server/fns'
import { formatDate, formatMoney } from '../lib/format'
import { StatusBadge } from '../components/StatusBadge'
import { StatusTimeline } from '../components/StatusTimeline'
import type { Product } from '../lib/types'

export const Route = createFileRoute('/orders/$id')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: async ({ params }) => {
    const [data, products] = await Promise.all([
      getOrder({ data: { id: params.id } }),
      getProducts(),
    ])
    return { ...data, products }
  },
  component: OrderDetail,
})

function OrderDetail() {
  const { order, shipment, products } = Route.useLoaderData()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const byId = new Map<string, Product>(products.map((p) => [p.id, p]))

  // Live updates: re-fetch the order until it reaches a terminal state, so the
  // saga's progress (pending → confirmed → shipped → delivered) appears without
  // a manual refresh. (Production-grade alternative: a WebSocket/SSE stream fed
  // by the order events — see README.)
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'
  useEffect(() => {
    if (isTerminal) return
    const id = setInterval(() => {
      void router.invalidate()
    }, 2500)
    return () => clearInterval(id)
  }, [isTerminal, router])

  async function onDeliver() {
    if (!shipment) return
    setBusy(true)
    try {
      await deliverShipment({ data: { shipmentId: shipment.id } })
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Link to="/orders" className="text-sm text-indigo-600 hover:underline">
        ← All orders
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-1 font-mono text-xs text-gray-500">{order.id}</div>
      <div className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Progress</h2>
          <StatusTimeline status={order.status} />

          {shipment?.tracking_number && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <div className="text-gray-500">Carrier: {shipment.carrier ?? 'N/A'}</div>
              <div className="mt-1">
                Tracking: <span className="font-mono">{shipment.tracking_number}</span>
              </div>
            </div>
          )}

          {shipment && shipment.status === 'shipped' && (
            <button
              onClick={onDeliver}
              disabled={busy}
              className="mt-4 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? 'Confirming…' : 'Simulate delivery'}
            </button>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Items</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {order.items?.map((item) => {
              const product = byId.get(item.productId)
              const fallback = `https://picsum.photos/seed/${item.productId}/120/120`
              return (
                <div key={item.id} data-testid="order-item" className="flex items-center gap-3 p-3">
                  <img
                    src={product?.imageUrl || fallback}
                    alt={product?.name ?? 'product'}
                    onError={(e) => {
                      if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
                    }}
                    className="h-14 w-14 flex-none rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {product?.name ?? item.productId}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatMoney(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-semibold">{formatMoney(item.totalPrice)}</div>
                </div>
              )
            })}
            <div className="flex items-center justify-between bg-gray-50 p-3">
              <span className="font-semibold">Total</span>
              <span data-testid="order-total" className="text-lg font-bold">
                {formatMoney(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>

          <h2 className="mb-2 mt-6 text-lg font-semibold">Ship to</h2>
          <address className="text-sm not-italic text-gray-600">
            {order.shippingAddress?.street}
            <br />
            {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
            {order.shippingAddress?.zipCode}
            <br />
            {order.shippingAddress?.country}
          </address>
        </section>
      </div>
    </div>
  )
}
