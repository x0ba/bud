export const HISTORY_RANGES = ['1M', '3M', 'YTD', '1Y', 'ALL'] as const
export type HistoryRange = (typeof HISTORY_RANGES)[number]

export type HistoryPoint = {
  date: string
  value: number
}

export type InvestmentSnap = {
  date: string
  totalValue: number
  byAccount: Array<{ accountId: string; value: number }>
  byHolding: Array<{
    holdingId: string
    accountId: string
    value: number
  }>
}

export type NetWorthAccountSnap = {
  date: string
  byAccount: Array<{ accountId: string; balance: number }>
}

/** Inclusive lower bound for a range, as `YYYY-MM-DD`, from a UTC day key. */
export function rangeCutoff(range: HistoryRange, today: string): string {
  if (range === 'ALL') return '0000-01-01'
  const [year, month, day] = today.split('-').map(Number)
  if (!year || !month || !day) return '0000-01-01'
  if (range === 'YTD') return `${year}-01-01`
  const date = new Date(Date.UTC(year, month - 1, 1))
  if (range === '1M') date.setUTCMonth(date.getUTCMonth() - 1)
  else if (range === '3M') date.setUTCMonth(date.getUTCMonth() - 3)
  else date.setUTCFullYear(date.getUTCFullYear() - 1)
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

/**
 * Build a daily series. Investment snapshots win on a given date; older
 * net-worth account balances fill gaps for the total and per-account views.
 */
export function investmentHistorySeries(args: {
  snapshots: Array<InvestmentSnap>
  fallback: Array<NetWorthAccountSnap>
  investmentAccountIds: ReadonlySet<string>
  cutoff: string
  accountId?: string
  holdingId?: string
}): Array<HistoryPoint> {
  const points = new Map<string, number>()
  const { snapshots, fallback, investmentAccountIds, cutoff } = args
  const accountId = args.accountId
  const holdingId = args.holdingId

  if (!holdingId) {
    for (const snap of fallback) {
      if (snap.date < cutoff) continue
      const rows = accountId
        ? snap.byAccount.filter((row) => row.accountId === accountId)
        : snap.byAccount.filter((row) =>
            investmentAccountIds.has(row.accountId),
          )
      if (rows.length === 0) continue
      points.set(
        snap.date,
        rows.reduce((sum, row) => sum + row.balance, 0),
      )
    }
  }

  let holdingFirst: string | undefined
  if (holdingId) {
    for (const snap of snapshots) {
      if (snap.byHolding.some((row) => row.holdingId === holdingId)) {
        holdingFirst = snap.date
        break
      }
    }
    if (!holdingFirst) return []
  }

  for (const snap of snapshots) {
    if (snap.date < cutoff) continue
    if (holdingId) {
      if (holdingFirst && snap.date < holdingFirst) continue
      const row = snap.byHolding.find((h) => h.holdingId === holdingId)
      points.set(snap.date, row?.value ?? 0)
      continue
    }
    if (accountId) {
      const fromHoldings = snap.byHolding.filter(
        (row) => row.accountId === accountId,
      )
      if (fromHoldings.length > 0) {
        points.set(
          snap.date,
          fromHoldings.reduce((sum, row) => sum + row.value, 0),
        )
        continue
      }
      const row = snap.byAccount.find((a) => a.accountId === accountId)
      if (row) points.set(snap.date, row.value)
      continue
    }
    points.set(snap.date, snap.totalValue)
  }

  return [...points.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}
