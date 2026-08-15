import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { writeInvestmentSnapshot } from './lib/investmentSnapshots'
import { addDays, lastWeekday, normalizeSymbol } from './lib/market'

export const ensureAlpacaSymbols = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query('holdings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    for (const holding of holdings) {
      const security = await ctx.db.get(holding.securityId)
      if (!security) continue
      const symbol = normalizeSymbol(security.alpacaSymbol ?? security.symbol)
      if (symbol && security.alpacaSymbol !== symbol) {
        await ctx.db.patch(security._id, { alpacaSymbol: symbol })
      }
    }
    return null
  },
})

export const listQuoteSymbolsForUser = internalQuery({
  args: { userId: v.id('users') },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query('holdings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    const symbols = new Set<string>()
    for (const holding of holdings) {
      const security = await ctx.db.get(holding.securityId)
      const symbol = normalizeSymbol(security?.alpacaSymbol ?? security?.symbol)
      if (symbol) symbols.add(symbol)
    }
    return [...symbols]
  },
})

export const listUsersWithHoldings = internalQuery({
  args: {},
  returns: v.array(v.id('users')),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    const ids = []
    for (const user of users) {
      const holding = await ctx.db
        .query('holdings')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first()
      if (holding) ids.push(user._id)
    }
    return ids
  },
})

export const historyGapsForUser = internalQuery({
  args: {
    userId: v.id('users'),
    asOf: v.string(),
    lookbackDays: v.number(),
  },
  returns: v.array(
    v.object({
      symbol: v.string(),
      start: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const symbols = new Set<string>()
    const holdings = await ctx.db
      .query('holdings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    for (const holding of holdings) {
      const security = await ctx.db.get(holding.securityId)
      const symbol = normalizeSymbol(security?.alpacaSymbol ?? security?.symbol)
      if (symbol) symbols.add(symbol)
    }

    const floor = addDays(args.asOf, -args.lookbackDays)
    const staleBefore = lastWeekday(args.asOf)
    const gaps: Array<{ symbol: string; start: string }> = []

    for (const symbol of symbols) {
      const last = await ctx.db
        .query('securityBars')
        .withIndex('by_symbol_date', (q) => q.eq('symbol', symbol))
        .order('desc')
        .first()
      if (!last) {
        gaps.push({ symbol, start: floor })
        continue
      }
      if (last.date < staleBefore) {
        gaps.push({ symbol, start: last.date })
      }
    }
    return gaps
  },
})

export const applyQuotes = internalMutation({
  args: {
    quotes: v.array(
      v.object({
        symbol: v.string(),
        price: v.number(),
        previousClose: v.optional(v.number()),
        dailyOpen: v.optional(v.number()),
        quotedAt: v.number(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let updated = 0
    for (const quote of args.quotes) {
      const securities = await ctx.db
        .query('securities')
        .withIndex('by_alpaca_symbol', (q) =>
          q.eq('alpacaSymbol', quote.symbol),
        )
        .collect()
      for (const security of securities) {
        await ctx.db.patch(security._id, {
          livePrice: quote.price,
          livePriceAt: quote.quotedAt,
          ...(quote.previousClose !== undefined
            ? { previousClose: quote.previousClose }
            : {}),
          ...(quote.dailyOpen !== undefined
            ? { dailyOpen: quote.dailyOpen }
            : {}),
        })
        updated += 1
      }
    }
    return updated
  },
})

export const snapshotUserInvestments = internalMutation({
  args: { userId: v.id('users') },
  returns: v.union(v.id('investmentSnapshots'), v.null()),
  handler: async (ctx, args) => {
    return await writeInvestmentSnapshot(ctx, args.userId)
  },
})

export const applyBars = internalMutation({
  args: {
    bars: v.array(
      v.object({
        symbol: v.string(),
        date: v.string(),
        open: v.number(),
        high: v.number(),
        low: v.number(),
        close: v.number(),
        volume: v.optional(v.number()),
      }),
    ),
    syncedAt: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let upserted = 0
    const symbols = new Set<string>()
    for (const bar of args.bars) {
      symbols.add(bar.symbol)
      const existing = await ctx.db
        .query('securityBars')
        .withIndex('by_symbol_date', (q) =>
          q.eq('symbol', bar.symbol).eq('date', bar.date),
        )
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, {
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        })
      } else {
        await ctx.db.insert('securityBars', bar)
      }
      upserted += 1
    }

    for (const symbol of symbols) {
      const first = await ctx.db
        .query('securityBars')
        .withIndex('by_symbol_date', (q) => q.eq('symbol', symbol))
        .order('asc')
        .first()
      const last = await ctx.db
        .query('securityBars')
        .withIndex('by_symbol_date', (q) => q.eq('symbol', symbol))
        .order('desc')
        .first()
      const securities = await ctx.db
        .query('securities')
        .withIndex('by_alpaca_symbol', (q) => q.eq('alpacaSymbol', symbol))
        .collect()
      for (const security of securities) {
        await ctx.db.patch(security._id, {
          historyFrom: first?.date,
          historyTo: last?.date,
          historySyncedAt: args.syncedAt,
        })
      }
    }
    return upserted
  },
})
