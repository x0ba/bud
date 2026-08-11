export function formatUsd(
  amount: number,
  opts?: { fromPlaid?: boolean; showSign?: boolean },
): string {
  // Plaid: positive = out. Display flip when fromPlaid.
  const value = opts?.fromPlaid ? -amount : amount
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  if (!opts?.showSign) {
    return opts?.fromPlaid ? formatted : new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatUsdPlain(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const due = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  const ms = due.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}
