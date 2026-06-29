const STYLES: Record<string, string> = {
  cart: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      data-testid="status-badge"
      data-status={status}
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  )
}
