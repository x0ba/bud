import { barDate, chunk, snapshotMark } from './market'

const DATA_URL = (
  process.env.ALPACA_DATA_URL ?? 'https://data.alpaca.markets'
).replace(/\/$/, '')

export type AlpacaBar = {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type AlpacaQuote = {
  symbol: string
  price: number
  previousClose?: number
  dailyOpen?: number
  quotedAt: number
}

export function alpacaCredentials(): {
  key: string
  secret: string
} | null {
  const key =
    process.env.ALPACA_API_KEY ??
    process.env.APCA_API_KEY_ID ??
    process.env.ALPACA_KEY_ID
  const secret =
    process.env.ALPACA_API_SECRET ??
    process.env.APCA_API_SECRET_KEY ??
    process.env.ALPACA_SECRET_KEY
  if (!key || !secret) return null
  return { key, secret }
}

export function isAlpacaConfigured(): boolean {
  return alpacaCredentials() != null
}

function alpacaHeaders(): HeadersInit {
  const creds = alpacaCredentials()
  if (!creds) {
    throw new Error(
      'Alpaca is not configured. Set ALPACA_API_KEY and ALPACA_API_SECRET.',
    )
  }
  return {
    'APCA-API-KEY-ID': creds.key,
    'APCA-API-SECRET-KEY': creds.secret,
  }
}

function feed(): string {
  return process.env.ALPACA_FEED ?? 'iex'
}

async function alpacaGet<T>(path: string, query: Record<string, string>) {
  const url = new URL(`${DATA_URL}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }
  const response = await fetch(url, { headers: alpacaHeaders() })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Alpaca ${path} failed (${response.status}): ${body.slice(0, 240)}`,
    )
  }
  return (await response.json()) as T
}

type Snapshot = {
  latestQuote?: { bp?: number; ap?: number; t?: string }
  latestTrade?: { p?: number; t?: string }
  dailyBar?: { o?: number; c?: number; t?: string }
  prevDailyBar?: { c?: number }
}

type SnapshotResponse = Record<string, Snapshot | undefined>

export async function fetchSnapshots(
  symbols: string[],
): Promise<AlpacaQuote[]> {
  const quotes: AlpacaQuote[] = []
  for (const group of chunk(symbols, 50)) {
    const data = await alpacaGet<SnapshotResponse>('/v2/stocks/snapshots', {
      symbols: group.join(','),
      feed: feed(),
    })
    for (const symbol of group) {
      const snap = data[symbol]
      if (!snap) continue
      const mark = snapshotMark(snap)
      if (mark.price == null) continue
      quotes.push({
        symbol,
        price: mark.price,
        previousClose: mark.previousClose,
        dailyOpen: mark.dailyOpen,
        quotedAt: mark.timestamp ? Date.parse(mark.timestamp) : Date.now(),
      })
    }
  }
  return quotes
}

type BarsResponse = {
  bars?: Record<
    string,
    Array<{
      t: string
      o: number
      h: number
      l: number
      c: number
      v?: number
    }>
  >
  next_page_token?: string | null
}

export async function fetchDailyBars(
  symbols: string[],
  start: string,
  end?: string,
): Promise<AlpacaBar[]> {
  const bars: AlpacaBar[] = []
  for (const group of chunk(symbols, 50)) {
    let page: string | undefined
    do {
      const data = await alpacaGet<BarsResponse>('/v2/stocks/bars', {
        symbols: group.join(','),
        timeframe: '1Day',
        start,
        end: end ?? '',
        limit: '10000',
        adjustment: 'split',
        feed: feed(),
        sort: 'asc',
        page_token: page ?? '',
      })
      for (const [symbol, rows] of Object.entries(data.bars ?? {})) {
        for (const row of rows) {
          bars.push({
            symbol,
            date: barDate(row.t),
            open: row.o,
            high: row.h,
            low: row.l,
            close: row.c,
            volume: row.v,
          })
        }
      }
      page = data.next_page_token ?? undefined
    } while (page)
  }
  return bars
}
