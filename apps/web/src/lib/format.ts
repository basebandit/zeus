export function formatMoney(amount: number | string, currency = 'USD'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
      Number.isFinite(value) ? value : 0,
    )
  } catch {
    return `${currency} ${value}`
  }
}

// Fixed locale + UTC so the server (UTC) and client render identically and don't
// trigger a hydration mismatch.
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

export function formatDate(input: string): string {
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? input : `${DATE_FMT.format(d)} UTC`
}
