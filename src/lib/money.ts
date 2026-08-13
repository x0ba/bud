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
    return opts?.fromPlaid
      ? formatted
      : new Intl.NumberFormat('en-US', {
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

/** Readable label for a `YYYY-MM` month key — year only when it isn't this one. */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return month
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    ...(year === new Date().getFullYear() ? {} : { year: 'numeric' }),
  })
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Parse a `YYYY-MM-DD` as local calendar time, not UTC midnight. */
function parseLocalDate(dateStr: string): Date | null {
  const date = new Date(dateStr + 'T12:00:00')
  return Number.isNaN(date.getTime()) ? null : date
}

/** Axis-style label for a `YYYY-MM-DD` date — "May 12". */
export function formatDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  if (!date) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Group subhead label for a `YYYY-MM-DD` ledger date. */
export function formatDayLabel(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  if (!date) return dateStr

  const diffDays = Math.round(
    (startOfLocalDay(new Date()) - startOfLocalDay(date)) / 86_400_000,
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: 'numeric' }),
  })
}

/** Compact "3h ago" for a sync timestamp — meta tier, never the headline. */
export function formatSyncedAgo(ts?: number | null): string | null {
  if (!ts) return null
  const minutes = Math.round((Date.now() - ts) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

/** Calendar days from today to a `YYYY-MM-DD` date. Due today is 0. */
export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const due = parseLocalDate(dateStr)
  if (!due) return null
  return Math.round(
    (startOfLocalDay(due) - startOfLocalDay(new Date())) / 86_400_000,
  )
}

/**
 * Plaid often keeps last cycle's due date after you pay, and `is_overdue`
 * can stick when a later sync sends null. Treat a card as overdue only when
 * the issuer still says so *and* the due date has passed — a $0 minimum
 * means the bill is paid.
 */
export function cardPaymentStatus(
  card: {
    nextPaymentDueDate?: string | null
    isOverdue?: boolean | null
    minimumPayment?: number | null
  },
  dueSoonWithin = 7,
): { days: number | null; overdue: boolean; dueSoon: boolean } {
  const days = daysUntil(card.nextPaymentDueDate)
  const paidOff = card.minimumPayment === 0
  const overdue =
    !paidOff && card.isOverdue === true && (days == null || days < 0)
  const dueSoon =
    !overdue && !paidOff && days != null && days >= 0 && days <= dueSoonWithin
  return { days, overdue, dueSoon }
}
