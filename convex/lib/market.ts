/** Alpaca-quoteable US equity / ETF tickers (AAPL, BRK.B). */
const ALPACA_SYMBOL = /^[A-Z]{1,5}(\.[A-Z])?$/

export type MarketRange = '1M' | '3M' | 'YTD' | '1Y'

export function normalizeSymbol(raw: string | undefined | null): string | null {
  if (!raw) return null
  const symbol = raw
    .trim()
    .toUpperCase()
    .replace(/[\s/]+/g, '.')
  return ALPACA_SYMBOL.test(symbol) ? symbol : null
}

export function resetMarketStateIfTickerChanged(input: {
  previousSymbol?: string | null
  nextSymbol?: string | null
}): {
  livePrice?: undefined
  livePriceAt?: undefined
  previousClose?: undefined
  dailyOpen?: undefined
  historyFrom?: undefined
  historyTo?: undefined
  historySyncedAt?: undefined
} {
  if ((input.previousSymbol ?? null) === (input.nextSymbol ?? null)) {
    return {}
  }
  return {
    livePrice: undefined,
    livePriceAt: undefined,
    previousClose: undefined,
    dailyOpen: undefined,
    historyFrom: undefined,
    historyTo: undefined,
    historySyncedAt: undefined,
  }
}

export function currentMarkPrice(input: {
  livePrice?: number
  closePrice?: number
  institutionPrice?: number
}): number | undefined {
  if (input.livePrice != null && input.livePrice > 0) return input.livePrice
  if (input.closePrice != null && input.closePrice > 0) return input.closePrice
  if (input.institutionPrice != null && input.institutionPrice > 0) {
    return input.institutionPrice
  }
  return undefined
}

export function markValue(
  quantity: number,
  price: number | undefined,
  fallback: number,
): number {
  if (price != null && quantity !== 0) return quantity * price
  return fallback
}

export function dayPnl(
  quantity: number,
  livePrice?: number,
  previousClose?: number,
): number | undefined {
  if (livePrice == null || previousClose == null) return undefined
  return (livePrice - previousClose) * quantity
}

export function snapshotMark(snapshot: {
  latestQuote?: { bp?: number; ap?: number; t?: string }
  latestTrade?: { p?: number; t?: string }
  dailyBar?: { o?: number; c?: number; t?: string }
  prevDailyBar?: { c?: number }
}): {
  price: number | undefined
  previousClose: number | undefined
  dailyOpen: number | undefined
  timestamp: string | undefined
} {
  const bid = snapshot.latestQuote?.bp
  const ask = snapshot.latestQuote?.ap
  const mid =
    bid != null && ask != null && bid > 0 && ask > 0
      ? (bid + ask) / 2
      : undefined
  const trade = snapshot.latestTrade?.p
  const close = snapshot.dailyBar?.c
  const price =
    mid ??
    (trade != null && trade > 0 ? trade : undefined) ??
    (close != null && close > 0 ? close : undefined)
  const timestamp =
    mid != null
      ? snapshot.latestQuote?.t
      : trade != null && trade > 0
        ? snapshot.latestTrade?.t
        : snapshot.dailyBar?.t
  const previousClose =
    snapshot.prevDailyBar?.c != null && snapshot.prevDailyBar.c > 0
      ? snapshot.prevDailyBar.c
      : undefined
  const dailyOpen =
    snapshot.dailyBar?.o != null && snapshot.dailyBar.o > 0
      ? snapshot.dailyBar.o
      : undefined
  return { price, previousClose, dailyOpen, timestamp }
}

export function reconcileHolding(input: {
  previousQuantity: number
  previousMarkValue: number
  plaidQuantity: number
  plaidValue: number
  livePrice?: number
}): {
  quantityDelta: number
  valueDelta: number
  markValueAfter: number | undefined
  priceDrift: number | undefined
} {
  const quantityDelta = input.plaidQuantity - input.previousQuantity
  const valueDelta = input.plaidValue - input.previousMarkValue
  const markValueAfter =
    input.livePrice != null ? input.plaidQuantity * input.livePrice : undefined
  const priceDrift =
    markValueAfter != null ? input.plaidValue - markValueAfter : undefined
  return { quantityDelta, valueDelta, markValueAfter, priceDrift }
}

export function rangeStart(asOf: string, range: MarketRange): string {
  const [year, month, day] = asOf.split('-').map(Number)
  if (!year || !month || !day) return asOf
  if (range === 'YTD') return `${year}-01-01`
  const date = new Date(year, month - 1, 1)
  if (range === '1M') date.setMonth(date.getMonth() - 1)
  if (range === '3M') date.setMonth(date.getMonth() - 3)
  if (range === '1Y') date.setFullYear(date.getFullYear() - 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return formatDay(date)
}

export function barDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })
}

export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return day
  const next = new Date(year, month - 1, date)
  next.setDate(next.getDate() + days)
  return formatDay(next)
}

function formatDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export type HistoryPosition = {
  symbol: string | null
  quantity: number
  cashValue: number
}

export type HistoryBar = {
  date: string
  close: number
}

export function reconstructHistory(
  positions: HistoryPosition[],
  barsBySymbol: Record<string, HistoryBar[]>,
  startDate: string,
  endDate: string,
): Array<{ date: string; value: number }> {
  const cash = positions.reduce(
    (sum, position) => sum + (position.symbol ? 0 : position.cashValue),
    0,
  )
  const dated = new Set<string>()
  const closes = new Map<string, Map<string, number>>()

  for (const [symbol, bars] of Object.entries(barsBySymbol)) {
    const byDate = new Map<string, number>()
    for (const bar of bars) {
      if (bar.date < startDate || bar.date > endDate) continue
      byDate.set(bar.date, bar.close)
      dated.add(bar.date)
    }
    closes.set(symbol, byDate)
  }

  const dates = [...dated].sort()
  if (dates.length === 0) {
    return cash !== 0 ? [{ date: endDate, value: cash }] : []
  }

  const lastClose = new Map<string, number>()
  const series: Array<{ date: string; value: number }> = []

  for (const date of dates) {
    for (const [symbol, byDate] of closes) {
      const close = byDate.get(date)
      if (close != null) lastClose.set(symbol, close)
    }
    let equity = 0
    let fullyPriced = true
    for (const position of positions) {
      if (!position.symbol) continue
      const close = lastClose.get(position.symbol)
      if (close == null) {
        fullyPriced = false
        continue
      }
      equity += position.quantity * close
    }
    if (fullyPriced) {
      series.push({ date, value: equity + cash })
    }
  }

  return series
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}
