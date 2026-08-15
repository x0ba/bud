import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addDays,
  barDate,
  currentMarkPrice,
  dayPnl,
  markValue,
  normalizeSymbol,
  rangeStart,
  reconcileHolding,
  reconstructHistory,
  resetMarketStateIfTickerChanged,
  snapshotMark,
} from './market.ts'

describe('normalizeSymbol', () => {
  it('accepts common equity tickers', () => {
    assert.equal(normalizeSymbol('aapl'), 'AAPL')
    assert.equal(normalizeSymbol('BRK B'), 'BRK.B')
    assert.equal(normalizeSymbol('brk/b'), 'BRK.B')
  })

  it('rejects cusips and empty values', () => {
    assert.equal(normalizeSymbol('037833100'), null)
    assert.equal(normalizeSymbol(''), null)
    assert.equal(normalizeSymbol(undefined), null)
  })
})

describe('mark-to-market', () => {
  it('prefers the Alpaca live print over the brokerage snapshot', () => {
    assert.equal(
      currentMarkPrice({
        livePrice: 190.5,
        closePrice: 188,
        institutionPrice: 187.2,
      }),
      190.5,
    )
    assert.equal(
      currentMarkPrice({ closePrice: 188, institutionPrice: 187.2 }),
      188,
    )
    assert.equal(markValue(10, 190.5, 1800), 1905)
    assert.equal(markValue(10, undefined, 1800), 1800)
  })

  it('uses the quote midpoint when both sides are live', () => {
    assert.deepEqual(
      snapshotMark({
        latestQuote: { bp: 100, ap: 102, t: '2026-08-15T14:30:00Z' },
        latestTrade: { p: 99, t: '2026-08-15T14:00:00Z' },
        dailyBar: { o: 98, c: 99.5, t: '2026-08-15T13:30:00Z' },
        prevDailyBar: { c: 97 },
      }),
      {
        price: 101,
        previousClose: 97,
        dailyOpen: 98,
        timestamp: '2026-08-15T14:30:00Z',
      },
    )
    assert.equal(
      snapshotMark({
        latestQuote: { bp: 0, ap: 0, t: 'quote' },
        latestTrade: { p: 99, t: 'trade' },
      }).timestamp,
      'trade',
    )
  })

  it('computes day P&L from previous close', () => {
    assert.equal(dayPnl(10, 110, 100), 100)
    assert.equal(dayPnl(10, 110, undefined), undefined)
  })

  it('drops the prior ticker mark when Plaid restates the symbol', () => {
    const stored = {
      livePrice: 42,
      livePriceAt: 1,
      previousClose: 40,
      dailyOpen: 41,
      historyFrom: '2026-01-01',
      historyTo: '2026-08-01',
      historySyncedAt: 2,
      closePrice: 10,
    }
    const sameTicker = resetMarketStateIfTickerChanged({
      previousSymbol: 'AAPL',
      nextSymbol: 'AAPL',
    })
    assert.deepEqual(sameTicker, {})
    assert.equal(currentMarkPrice({ ...stored, ...sameTicker }), 42)

    const renamed = resetMarketStateIfTickerChanged({
      previousSymbol: 'FB',
      nextSymbol: 'META',
    })
    assert.equal(
      currentMarkPrice({ ...stored, ...renamed, closePrice: 11 }),
      11,
    )
    assert.equal(renamed.historyTo, undefined)
  })
})

describe('reconcileHolding', () => {
  it('keeps the pre-reset mark as the reconcile baseline on a ticker change', () => {
    const previousMarkValue = markValue(
      10,
      currentMarkPrice({
        livePrice: 125,
        closePrice: 50,
        institutionPrice: 125,
      }),
      1250,
    )
    const rec = reconcileHolding({
      previousQuantity: 10,
      previousMarkValue,
      plaidQuantity: 10,
      plaidValue: 1250,
      livePrice: currentMarkPrice({ closePrice: 50, institutionPrice: 125 }),
    })
    assert.equal(previousMarkValue, 1250)
    assert.equal(rec.valueDelta, 0)
  })

  it('records the gap between the marked book and the Plaid restatement', () => {
    const rec = reconcileHolding({
      previousQuantity: 10,
      previousMarkValue: 1900,
      plaidQuantity: 12,
      plaidValue: 2280,
      livePrice: 191,
    })
    assert.equal(rec.quantityDelta, 2)
    assert.equal(rec.valueDelta, 380)
    assert.equal(rec.markValueAfter, 2292)
    assert.equal(rec.priceDrift, -12)
  })
})

describe('history', () => {
  it('walks current quantities through daily closes and keeps cash flat', () => {
    const series = reconstructHistory(
      [
        { symbol: 'AAPL', quantity: 2, cashValue: 0 },
        { symbol: null, quantity: 0, cashValue: 100 },
      ],
      {
        AAPL: [
          { date: '2026-01-01', close: 100 },
          { date: '2026-01-02', close: 110 },
          { date: '2026-01-04', close: 105 },
        ],
      },
      '2026-01-01',
      '2026-01-04',
    )
    assert.deepEqual(series, [
      { date: '2026-01-01', value: 300 },
      { date: '2026-01-02', value: 320 },
      { date: '2026-01-04', value: 310 },
    ])
  })

  it('keeps a cash-only book as a single point when there are no bars', () => {
    assert.deepEqual(
      reconstructHistory(
        [{ symbol: null, quantity: 0, cashValue: 250 }],
        {},
        '2026-01-01',
        '2026-01-04',
      ),
      [{ date: '2026-01-04', value: 250 }],
    )
  })

  it('waits until every ticker has a close before emitting a date', () => {
    const series = reconstructHistory(
      [
        { symbol: 'AAPL', quantity: 1, cashValue: 0 },
        { symbol: 'MSFT', quantity: 1, cashValue: 0 },
      ],
      {
        AAPL: [
          { date: '2026-01-01', close: 10 },
          { date: '2026-01-02', close: 12 },
        ],
        MSFT: [{ date: '2026-01-02', close: 20 }],
      },
      '2026-01-01',
      '2026-01-02',
    )
    assert.deepEqual(series, [{ date: '2026-01-02', value: 32 }])
  })

  it('forward-fills a missing close so the line does not drop to zero', () => {
    const series = reconstructHistory(
      [
        { symbol: 'AAPL', quantity: 1, cashValue: 0 },
        { symbol: 'MSFT', quantity: 1, cashValue: 0 },
      ],
      {
        AAPL: [
          { date: '2026-01-01', close: 10 },
          { date: '2026-01-02', close: 12 },
        ],
        MSFT: [{ date: '2026-01-01', close: 20 }],
      },
      '2026-01-01',
      '2026-01-02',
    )
    assert.deepEqual(series, [
      { date: '2026-01-01', value: 30 },
      { date: '2026-01-02', value: 32 },
    ])
  })

  it('computes range starts from the client as-of day', () => {
    assert.equal(rangeStart('2026-08-15', 'YTD'), '2026-01-01')
    assert.equal(rangeStart('2026-08-15', '1M'), '2026-07-15')
    assert.equal(rangeStart('2026-08-15', '1Y'), '2025-08-15')
    assert.equal(rangeStart('2026-03-31', '1M'), '2026-02-28')
    assert.equal(addDays('2026-08-15', -4), '2026-08-11')
  })

  it('maps Alpaca bar timestamps onto the New York session date', () => {
    assert.equal(barDate('2026-01-02T05:00:00Z'), '2026-01-02')
  })
})
