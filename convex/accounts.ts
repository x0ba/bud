import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { monthBounds } from './lib/money'

const accountDoc = v.object({
  _id: v.id('accounts'),
  itemId: v.id('plaidItems'),
  name: v.string(),
  officialName: v.optional(v.string()),
  mask: v.optional(v.string()),
  type: v.union(
    v.literal('depository'),
    v.literal('credit'),
    v.literal('investment'),
    v.literal('loan'),
    v.literal('other'),
  ),
  subtype: v.optional(v.string()),
  currentBalance: v.number(),
  availableBalance: v.optional(v.number()),
  limit: v.optional(v.number()),
  isoCurrency: v.string(),
  isHidden: v.boolean(),
  isClosed: v.boolean(),
  lastStatementBalance: v.optional(v.number()),
  lastStatementDate: v.optional(v.string()),
  nextPaymentDueDate: v.optional(v.string()),
  minimumPayment: v.optional(v.number()),
  aprs: v.optional(
    v.array(
      v.object({
        aprPercentage: v.number(),
        aprType: v.string(),
      }),
    ),
  ),
  isOverdue: v.optional(v.boolean()),
  institutionName: v.optional(v.string()),
  itemStatus: v.optional(
    v.union(
      v.literal('ok'),
      v.literal('login_required'),
      v.literal('error'),
    ),
  ),
})

export const list = authedQuery({
  args: {},
  returns: v.array(accountDoc),
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const itemMap = new Map(items.map((i) => [i._id, i]))

    return accounts.map((a) => {
      const item = itemMap.get(a.itemId)
      return {
        _id: a._id,
        itemId: a.itemId,
        name: a.name,
        officialName: a.officialName,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype,
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
        limit: a.limit,
        isoCurrency: a.isoCurrency,
        isHidden: a.isHidden,
        isClosed: a.isClosed,
        lastStatementBalance: a.lastStatementBalance,
        lastStatementDate: a.lastStatementDate,
        nextPaymentDueDate: a.nextPaymentDueDate,
        minimumPayment: a.minimumPayment,
        aprs: a.aprs,
        isOverdue: a.isOverdue,
        institutionName: item?.institutionName,
        itemStatus: item?.status,
      }
    })
  },
})

export const listItems = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('plaidItems'),
      institutionName: v.string(),
      status: v.union(
        v.literal('ok'),
        v.literal('login_required'),
        v.literal('error'),
      ),
      lastSyncedAt: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      accountCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()

    return items.map((item) => ({
      _id: item._id,
      institutionName: item.institutionName,
      status: item.status,
      lastSyncedAt: item.lastSyncedAt,
      errorMessage: item.errorMessage,
      accountCount: accounts.filter((a) => a.itemId === item._id).length,
    }))
  },
})

export const get = authedQuery({
  args: { accountId: v.id('accounts') },
  returns: v.union(accountDoc, v.null()),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.accountId)
    if (!a || a.userId !== ctx.user._id) return null
    const item = await ctx.db.get(a.itemId)
    return {
      _id: a._id,
      itemId: a.itemId,
      name: a.name,
      officialName: a.officialName,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      currentBalance: a.currentBalance,
      availableBalance: a.availableBalance,
      limit: a.limit,
      isoCurrency: a.isoCurrency,
      isHidden: a.isHidden,
      isClosed: a.isClosed,
      lastStatementBalance: a.lastStatementBalance,
      lastStatementDate: a.lastStatementDate,
      nextPaymentDueDate: a.nextPaymentDueDate,
      minimumPayment: a.minimumPayment,
      aprs: a.aprs,
      isOverdue: a.isOverdue,
      institutionName: item?.institutionName,
      itemStatus: item?.status,
    }
  },
})

export const creditCards = authedQuery({
  args: {},
  returns: v.array(accountDoc),
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user_type', (q) =>
        q.eq('userId', ctx.user._id).eq('type', 'credit'),
      )
      .collect()
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const itemMap = new Map(items.map((i) => [i._id, i]))

    return accounts
      .filter((a) => !a.isHidden && !a.isClosed)
      .map((a) => {
        const item = itemMap.get(a.itemId)
        return {
          _id: a._id,
          itemId: a.itemId,
          name: a.name,
          officialName: a.officialName,
          mask: a.mask,
          type: a.type,
          subtype: a.subtype,
          currentBalance: a.currentBalance,
          availableBalance: a.availableBalance,
          limit: a.limit,
          isoCurrency: a.isoCurrency,
          isHidden: a.isHidden,
          isClosed: a.isClosed,
          lastStatementBalance: a.lastStatementBalance,
          lastStatementDate: a.lastStatementDate,
          nextPaymentDueDate: a.nextPaymentDueDate,
          minimumPayment: a.minimumPayment,
          aprs: a.aprs,
          isOverdue: a.isOverdue,
          institutionName: item?.institutionName,
          itemStatus: item?.status,
        }
      })
      .sort((a, b) => {
        const da = a.nextPaymentDueDate ?? '9999'
        const db = b.nextPaymentDueDate ?? '9999'
        return da.localeCompare(db)
      })
  },
})

export const setHidden = authedMutation({
  args: { accountId: v.id('accounts'), isHidden: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.accountId)
    if (!a || a.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.patch(args.accountId, { isHidden: args.isHidden })
    return null
  },
})

export const spendingThisMonth = authedQuery({
  args: { accountId: v.id('accounts'), month: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)
    if (!account || account.userId !== ctx.user._id) return 0
    const { start, end } = monthBounds(args.month)
    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_account_date', (q) =>
        q.eq('accountId', args.accountId).gte('date', start).lte('date', end),
      )
      .collect()
    return txs
      .filter((t) => !t.isTransfer && !t.isHidden && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
  },
})
