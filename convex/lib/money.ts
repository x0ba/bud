/** Plaid sign convention: positive = money out (spend), negative = money in. */

export function isExpense(amount: number): boolean {
  return amount > 0
}

export function isIncome(amount: number): boolean {
  return amount < 0
}

export function expenseAmount(amount: number): number {
  return amount > 0 ? amount : 0
}

export function incomeAmount(amount: number): number {
  return amount < 0 ? Math.abs(amount) : 0
}

export function signedDisplay(amount: number): number {
  // Flip for human display: income positive, spend negative
  return -amount
}

export function formatUsd(amount: number, opts?: { signed?: boolean }): string {
  const value = opts?.signed ? signedDisplay(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function countsTowardBudget(tx: {
  isTransfer: boolean
  isHidden: boolean
  pending?: boolean
  amount: number
}): boolean {
  if (tx.isTransfer || tx.isHidden) return false
  return isExpense(tx.amount)
}

export function countsTowardSpending(tx: {
  isTransfer: boolean
  isHidden: boolean
  amount: number
}): boolean {
  if (tx.isTransfer || tx.isHidden) return false
  return isExpense(tx.amount)
}

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

/** Shift a `YYYY-MM` key by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(Date.UTC(y, m - 1 + delta, 1)))
}

export function daysInMonth(month: string): number {
  return Number(monthBounds(month).end.slice(8, 10))
}

export function dayOfMonthProgress(now = new Date()): {
  day: number
  daysInMonth: number
  pct: number
} {
  const day = now.getUTCDate()
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate()
  return { day, daysInMonth, pct: day / daysInMonth }
}

export function utilization(
  balance: number,
  limit?: number | null,
): number | null {
  if (limit == null || limit <= 0) return null
  return Math.min(1, Math.max(0, balance / limit))
}
