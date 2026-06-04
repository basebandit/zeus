import type { OrderStatus } from '../lib/types'

// The happy-path saga progression shown as a timeline.
const STEPS: Array<{ key: OrderStatus; label: string }> = [
  { key: 'pending', label: 'Order placed' },
  { key: 'confirmed', label: 'Payment confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        This order was cancelled.
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status)

  return (
    <ol className="space-y-4">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={done ? 'font-medium' : 'text-gray-400'}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
