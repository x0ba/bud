import { v } from 'convex/values'
import { authedQuery } from './lib/customFunctions'

const holdingRow = v.object({
  _id: v.id('holdings'),
  name: v.string(),
  symbol: v.optional(v.string()),
  quantity: v.number(),
  institutionValue: v.number(),
  institutionPrice: v.number(),
  costBasis: v.optional(v.number()),
  accountName: v.optional(v.string()),
  type: v.optional(v.string()),
})

export const portfolio = authedQuery({
  args: {},
  returns: v.object({
    totalValue: v.number(),
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

    const rows = []
    let holdingsValue = 0
    const byTypeMap = new Map<string, number>()

    for (const h of holdings) {
      const security = await ctx.db.get(h.securityId)
      holdingsValue += h.institutionValue
      const type = security?.type ?? 'other'
      byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + h.institutionValue)
      rows.push({
        _id: h._id,
        name: security?.name ?? 'Security',
        symbol: security?.symbol,
        quantity: h.quantity,
        institutionValue: h.institutionValue,
        institutionPrice: h.institutionPrice,
        costBasis: h.costBasis,
        accountName: accountMap.get(h.accountId),
        type,
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
              ]),
            ).values(),
          ]
        : []

    const accountValue = investmentAccounts.reduce(
      (sum, a) => sum + a.currentBalance,
      0,
    )

    return {
      totalValue: rows.length > 0 ? holdingsValue : accountValue,
      holdings: rows.sort((a, b) => b.institutionValue - a.institutionValue),
      byType: [...byTypeMap.entries()].map(([type, value]) => ({
        type,
        value,
      })),
      accounts: investmentAccounts,
      accessItems,
    }
  },
})
