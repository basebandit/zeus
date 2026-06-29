import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { listOrders } from '../lib/server/fns'
import { formatDate, formatMoney } from '../lib/format'
import { StatusBadge } from '../components/StatusBadge'

export const Route = createFileRoute('/orders/')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: async () => ({ orders: await listOrders() }),
  component: OrdersPage,
})

function OrdersPage() {
  const { orders } = Route.useLoaderData()

  if (!orders.length) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold">Your orders</h1>
        <p className="text-gray-500">
          You have no orders yet.{' '}
          <Link to="/" className="text-indigo-600 hover:underline">
            Start shopping
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Your orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            data-testid="order-row"
            to="/orders/$id"
            params={{ id: order.id }}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300"
          >
            <div>
              <div className="font-mono text-xs text-gray-500">{order.id}</div>
              <div className="mt-1 text-sm text-gray-500">
                {formatDate(order.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold">{formatMoney(order.totalAmount, order.currency)}</span>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
