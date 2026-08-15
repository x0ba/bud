'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { action, internalAction } from './_generated/server'
import {
  fetchDailyBars,
  fetchSnapshots,
  isAlpacaConfigured,
} from './lib/alpaca'
import { chunk } from './lib/market'

const BAR_MUTATION_CHUNK = 200

const refreshResult = v.object({
  configured: v.boolean(),
  quotesUpdated: v.number(),
  barsUpdated: v.number(),
  skipped: v.array(v.string()),
  error: v.optional(v.string()),
})

type RefreshResult = {
  configured: boolean
  quotesUpdated: number
  barsUpdated: number
  skipped: string[]
  error?: string
}

async function refreshUserMarketData(
  ctx: ActionCtx,
  args: { userId: Id<'users'>; backfill: boolean; asOf?: string },
): Promise<RefreshResult> {
  if (!isAlpacaConfigured()) {
    return {
      configured: false,
      quotesUpdated: 0,
      barsUpdated: 0,
      skipped: [],
    }
  }

  await ctx.runMutation(internal.alpacaMutations.ensureAlpacaSymbols, {
    userId: args.userId,
  })
  const symbols: string[] = await ctx.runQuery(
    internal.alpacaMutations.listQuoteSymbolsForUser,
    { userId: args.userId },
  )
  if (symbols.length === 0) {
    return {
      configured: true,
      quotesUpdated: 0,
      barsUpdated: 0,
      skipped: [],
    }
  }

  let quotesUpdated = 0
  let barsUpdated = 0
  let skipped: string[] = []
  try {
    const quotes = await fetchSnapshots(symbols)
    const quoted = new Set(quotes.map((q) => q.symbol))
    skipped = symbols.filter((s) => !quoted.has(s))
    quotesUpdated = await ctx.runMutation(
      internal.alpacaMutations.applyQuotes,
      { quotes },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Alpaca request failed'
    console.error('Alpaca quote refresh failed', message)
    return {
      configured: true,
      quotesUpdated,
      barsUpdated,
      skipped: skipped.length > 0 ? skipped : symbols,
      error: message,
    }
  }

  if (!args.backfill) {
    return { configured: true, quotesUpdated, barsUpdated, skipped }
  }

  try {
    const asOf = args.asOf ?? new Date().toISOString().slice(0, 10)
    const gaps = await ctx.runQuery(
      internal.alpacaMutations.historyGapsForUser,
      { userId: args.userId, asOf, lookbackDays: 400 },
    )
    const byStart = new Map<string, string[]>()
    for (const gap of gaps) {
      const list = byStart.get(gap.start) ?? []
      list.push(gap.symbol)
      byStart.set(gap.start, list)
    }
    for (const [start, group] of byStart) {
      const bars = await fetchDailyBars(group, start, asOf)
      if (bars.length === 0) continue
      for (const piece of chunk(bars, BAR_MUTATION_CHUNK)) {
        barsUpdated += await ctx.runMutation(
          internal.alpacaMutations.applyBars,
          { bars: piece, syncedAt: Date.now() },
        )
      }
    }
    return { configured: true, quotesUpdated, barsUpdated, skipped }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Alpaca request failed'
    console.error('Alpaca history backfill failed', message)
    return {
      configured: true,
      quotesUpdated,
      barsUpdated,
      skipped,
      error: message,
    }
  }
}

export const refreshForUser = internalAction({
  args: {
    userId: v.id('users'),
    backfill: v.boolean(),
    asOf: v.optional(v.string()),
  },
  returns: refreshResult,
  handler: async (ctx, args): Promise<RefreshResult> => {
    return await refreshUserMarketData(ctx, args)
  },
})

export const refreshMarketData = action({
  args: {
    backfill: v.optional(v.boolean()),
    asOf: v.optional(v.string()),
  },
  returns: refreshResult,
  handler: async (ctx, args): Promise<RefreshResult> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const userId: Id<'users'> | null = await ctx.runQuery(
      internal.plaidMutations.getUserByClerkId,
      { clerkId: identity.subject },
    )
    if (!userId) throw new Error('User not ready')

    return await refreshUserMarketData(ctx, {
      userId,
      backfill: args.backfill ?? true,
      asOf: args.asOf,
    })
  },
})

export const refreshAllQuotes = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!isAlpacaConfigured()) return null
    const userIds = await ctx.runQuery(
      internal.alpacaMutations.listUsersWithHoldings,
      {},
    )
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.alpacaActions.refreshForUser, {
        userId,
        backfill: false,
      })
    }
    return null
  },
})
