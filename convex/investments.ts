import { v } from 'convex/values'
import { authedQuery } from './lib/customFunctions'

export const portfolio = authedQuery({
  args: {},
  returns: v.object({
    totalValue: v.number(),
    holdings: v.array(
      v.object({
        _id: v.id('holdings'),
        name: v.string(),
        symbol: v.optional(v.string()),
        quantity: v.number(),
        institutionValue: v.number(),
        institutionPrice: v.number(),
        costBasis: v.optional(v.number()),
        accountName: v.optional(v.string()),
        type: v.optional(v.string()),
      }),
    ),
    byType: v.array(
      v.object({
        type: v.string(),
        value: v.number(),
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
    const accountMap = new Map(accounts.map((a) => [a._id, a.name]))

    const rows = []
    let totalValue = 0
    const byTypeMap = new Map<string, number>()

    for (const h of holdings) {
      const security = await ctx.db.get(h.securityId)
      totalValue += h.institutionValue
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

    return {
      totalValue,
      holdings: rows.sort((a, b) => b.institutionValue - a.institutionValue),
      byType: [...byTypeMap.entries()].map(([type, value]) => ({ type, value })),
    }
  },
})
