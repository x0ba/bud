import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { isAlpacaConfigured } from './lib/alpaca'
import {
  investmentHistorySeries,
  rangeCutoff,
  type HistoryRange,
} from './lib/investmentHistory'
import { writeInvestmentSnapshot } from './lib/investmentSnapshots'
import {
  currentMarkPrice,
  dayPnl,
  markValue,
  normalizeSymbol,
  reconstructHistory,
} from './lib/market'

const holdingRow = v.object({
  _id: v.id('holdings'),
  name: v.string(),
  symbol: v.optional(v.string()),
  alpacaSymbol: v.optional(v.string()),
  quantity: v.number(),
  institutionValue: v.number(),
  institutionPrice: v.number(),
  markPrice: v.optional(v.number()),
  markValue: v.number(),
  priceSource: v.union(v.literal('alpaca'), v.literal('plaid')),
  dayChange: v.optional(v.number()),
  dayChangePct: v.optional(v.number()),
  costBasis: v.optional(v.number()),
  accountName: v.optional(v.string()),
  type: v.optional(v.string()),
  quotedAt: v.optional(v.number()),
  lastPlaidSyncedAt: v.optional(v.number()),
  lastReconcileDelta: v.optional(v.number()),
})

const historyRange = v.union(
  v.literal('1M'),
  v.literal('3M'),
  v.literal('YTD'),
  v.literal('1Y'),
  v.literal('ALL'),
)

export const marketStatus = authedQuery({
  args: {},
  returns: v.object({ configured: v.boolean() }),
  handler: async () => ({ configured: isAlpacaConfigured() }),
})

export const portfolio = authedQuery({
  args: {},
  returns: v.object({
    totalValue: v.number(),
    dayChange: v.optional(v.number()),
    quotedAt: v.optional(v.number()),
    lastPlaidSyncedAt: v.optional(v.number()),
    historyReady: v.boolean(),
    holdings: v.array(holdingRow),
    byType: v.array(
      v.object({
        type: v.string(),
        value: v.number(),
      }),
    ),
    accounts: v.array(
      v.object({
        _id: v.id('accounts'),
        itemId: v.id('plaidItems'),
        name: v.string(),
        subtype: v.optional(v.string()),
        institutionName: v.optional(v.string()),
        currentBalance: v.number(),
      }),
    ),
    accessItems: v.array(
      v.object({
        itemId: v.id('plaidItems'),
        institutionName: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const holdings = await ctx.db
      .query('holdings')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const accountMap = new Map(accounts.map((a) => [a._id, a.name]))
    const itemMap = new Map(items.map((i) => [i._id, i]))

    const investmentAccounts = accounts
      .filter((a) => a.type === 'investment' && !a.isHidden && !a.isClosed)
      .map((a) => ({
        _id: a._id,
        itemId: a.itemId,
        name: a.name,
        subtype: a.subtype,
        institutionName: itemMap.get(a.itemId)?.institutionName,
        currentBalance: a.currentBalance,
      }))
      .sort((a, b) => b.currentBalance - a.currentBalance)
    const investmentIds = new Set(
      investmentAccounts.map((account) => account._id),
    )
    const activeHoldings = holdings.filter((holding) =>
      investmentIds.has(holding.accountId),
    )

    const rows = []
    let dayChangeSum = 0
    let hasDayChange = false
    let quotedAt: number | undefined
    let lastPlaidSyncedAt: number | undefined
    let quoteable = 0
    let withHistory = 0
    const byTypeMap = new Map<string, number>()
    const holdingsByAccount = new Map<string, number>()

    for (const h of activeHoldings) {
      const security = await ctx.db.get(h.securityId)
      const price = currentMarkPrice({
        livePrice: security?.livePrice,
        closePrice: security?.closePrice,
        institutionPrice: h.institutionPrice,
      })
      const value = markValue(h.quantity, price, h.institutionValue)
      const source: 'alpaca' | 'plaid' =
        security?.livePrice != null ? 'alpaca' : 'plaid'
      const change = dayPnl(
        h.quantity,
        security?.livePrice,
        security?.previousClose,
      )
      const type = security?.type ?? 'other'
      const alpacaSymbol = normalizeSymbol(
        security?.alpacaSymbol ?? security?.symbol,
      )

      byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + value)
      holdingsByAccount.set(
        h.accountId,
        (holdingsByAccount.get(h.accountId) ?? 0) + value,
      )
      if (change != null) {
        dayChangeSum += change
        hasDayChange = true
      }
      if (security?.livePriceAt != null) {
        quotedAt =
          quotedAt == null
            ? security.livePriceAt
            : Math.max(quotedAt, security.livePriceAt)
      }
      if (h.lastPlaidSyncedAt != null) {
        lastPlaidSyncedAt =
          lastPlaidSyncedAt == null
            ? h.lastPlaidSyncedAt
            : Math.max(lastPlaidSyncedAt, h.lastPlaidSyncedAt)
      }
      if (alpacaSymbol) {
        quoteable += 1
        if (security?.historyTo) withHistory += 1
      }

      rows.push({
        _id: h._id,
        name: security?.name ?? 'Security',
        symbol: security?.symbol,
        alpacaSymbol: alpacaSymbol ?? undefined,
        quantity: h.quantity,
        institutionValue: h.institutionValue,
        institutionPrice: h.institutionPrice,
        markPrice: price,
        markValue: value,
        priceSource: source,
        dayChange: change,
        dayChangePct:
          change != null &&
          security?.livePrice != null &&
          security.previousClose
            ? (security.livePrice - security.previousClose) /
              security.previousClose
            : undefined,
        costBasis: h.costBasis,
        accountName: accountMap.get(h.accountId),
        type,
        quotedAt: security?.livePriceAt,
        lastPlaidSyncedAt: h.lastPlaidSyncedAt,
        lastReconcileDelta: h.lastReconcileDelta,
      })
    }

    const accessItems =
      rows.length === 0
        ? [
            ...new Map(
              investmentAccounts.map((a) => [
                a.itemId,
                {
                  itemId: a.itemId,
                  institutionName: a.institutionName ?? 'Institution',
                },
              )),
            ).values(),
          ]
        : []
    const totalValue = investmentAccounts.reduce(
      (sum, account) =>
        sum + (holdingsByAccount.get(account._id) ?? account.currentBalance),
      0,
    )

    return {
      totalValue,
      dayChange: hasDayChange ? dayChangeSum : undefined,
      quotedAt,
      lastPlaidSyncedAt,
      historyReady: quoteable === 0 || withHistory === quoteable,
      holdings: rows.sort((a, b) => b.markValue - a.markValue),
      byType: [...byTypeMap.entries()].map(([type, value]) => ({
        type,
        value,
      })),
      accounts: investmentAccounts,
      accessItems,
    }
  },
})

export const history = authedQuery({
  args: {
    range: v.optional(historyRange),
    today: v.string(),
    accountId: v.optional(v.id('accounts')),
    holdingId: v.optional(v.id('holdings')),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      value: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId)
      if (!account || account.userId !== ctx.user._id) {
        throw new Error('Account not found')
      }
    }
    if (args.holdingId) {
      const holding = await ctx.db.get(args.holdingId)
      if (!holding || holding.userId !== ctx.user._id) {
        throw new Error('Holding not found')
      }
      const fromBars = await historyFromBars(
        ctx,
        holding,
        args.range ?? '3M',
        args.today,
      )
      if (fromBars && fromBars.length > 0) return fromBars
    }

    const [snapshots, netWorthSnaps, accounts] = await Promise.all([
      ctx.db
        .query('investmentSnapshots')
        .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
        .order('asc')
        .collect(),
      ctx.db
        .query('netWorthSnapshots')
        .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
        .order('asc')
        .collect(),
      ctx.db
        .query('accounts')
        .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
        .collect(),
    ])

    const investmentAccountIds = new Set(
      accounts
        .filter(
          (account) =>
            account.type === 'investment' &&
            !account.isHidden &&
            !account.isClosed,
        )
        .map((account) => account._id),
    )

    return investmentHistorySeries({
      snapshots: snapshots.map((snap) => ({
        date: snap.date,
        totalValue: snap.totalValue,
        byAccount: snap.byAccount.map((row) => ({
          accountId: row.accountId,
          value: row.value,
        })),
        byHolding: snap.byHolding.map((row) => ({
          holdingId: row.holdingId,
          accountId: row.accountId,
          value: row.value,
        })),
      })),
      fallback: netWorthSnaps.map((snap) => ({
        date: snap.date,
        byAccount: snap.byAccount.map((row) => ({
          accountId: row.accountId,
          balance: row.balance,
        })),
      })),
      investmentAccountIds,
      cutoff: rangeCutoff(args.range ?? '3M', args.today),
      accountId: args.accountId,
      holdingId: args.holdingId,
    })
  },
})

export const snapshotNow = authedMutation({
  args: {},
  returns: v.union(v.id('investmentSnapshots'), v.null()),
  handler: async (ctx) => {
    return await writeInvestmentSnapshot(ctx, ctx.user._id)
  },
})

async function historyFromBars(
  ctx: QueryCtx,
  holding: Doc<'holdings'>,
  range: HistoryRange,
  today: string,
): Promise<Array<{ date: string; value: number }> | null> {
  const security = await ctx.db.get(holding.securityId)
  const symbol = normalizeSymbol(security?.alpacaSymbol ?? security?.symbol)
  if (!symbol) return null
  const start = rangeCutoff(range, today)
  const rows = await ctx.db
    .query('securityBars')
    .withIndex('by_symbol_date', (q) => q.eq('symbol', symbol).gte('date', start))
    .collect()
  const bars = rows
    .filter((row) => row.date <= today)
    .map((row) => ({ date: row.date, close: row.close }))
  if (bars.length === 0) return null
  return reconstructHistory(
    [{ symbol, quantity: holding.quantity, cashValue: 0 }],
    { [symbol]: bars },
    start,
    today,
  )
}
