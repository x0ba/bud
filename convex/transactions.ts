import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { monthBounds } from './lib/money'

const transactionDoc = v.object({
  _id: v.id('transactions'),
  accountId: v.id('accounts'),
  date: v.string(),
  amount: v.number(),
  merchantName: v.optional(v.string()),
  originalDescription: v.string(),
  pending: v.boolean(),
  categoryId: v.optional(v.id('categories')),
  categorySource: v.union(
    v.literal('plaid'),
    v.literal('rule'),
    v.literal('user'),
  ),
  isTransfer: v.boolean(),
  isHidden: v.boolean(),
  notes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  accountName: v.optional(v.string()),
  categoryName: v.optional(v.string()),
  categoryColor: v.optional(v.string()),
})

export const list = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    accountId: v.optional(v.id('accounts')),
    categoryId: v.optional(v.id('categories')),
    search: v.optional(v.string()),
    month: v.optional(v.string()),
    includeHidden: v.optional(v.boolean()),
    includeTransfers: v.optional(v.boolean()),
  },
  returns: v.object({
    page: v.array(transactionDoc),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    let bounds: { start: string; end: string } | null = null
    if (args.month) bounds = monthBounds(args.month)

    const result = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .paginate(args.paginationOpts)

    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const accountMap = new Map(accounts.map((a) => [a._id, a]))

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const categoryMap = new Map(categories.map((c) => [c._id, c]))

    const search = args.search?.toLowerCase().trim()

    const page = result.page
      .filter((tx) => {
        if (args.accountId && tx.accountId !== args.accountId) return false
        if (args.categoryId && tx.categoryId !== args.categoryId) return false
        if (!args.includeHidden && tx.isHidden) return false
        if (!args.includeTransfers && tx.isTransfer) return false
        if (bounds && (tx.date < bounds.start || tx.date > bounds.end))
          return false
        if (search) {
          const hay = `${tx.merchantName ?? ''} ${tx.originalDescription}`.toLowerCase()
          if (!hay.includes(search)) return false
        }
        return true
      })
      .map((tx) => {
        const account = accountMap.get(tx.accountId)
        const category = tx.categoryId
          ? categoryMap.get(tx.categoryId)
          : undefined
        return {
          _id: tx._id,
          accountId: tx.accountId,
          date: tx.date,
          amount: tx.amount,
          merchantName: tx.merchantName,
          originalDescription: tx.originalDescription,
          pending: tx.pending,
          categoryId: tx.categoryId,
          categorySource: tx.categorySource,
          isTransfer: tx.isTransfer,
          isHidden: tx.isHidden,
          notes: tx.notes,
          tags: tx.tags,
          accountName: account?.name,
          categoryName: category?.name,
          categoryColor: category?.color,
        }
      })

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const recent = authedQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(transactionDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8
    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .take(40)

    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const accountMap = new Map(accounts.map((a) => [a._id, a]))
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const categoryMap = new Map(categories.map((c) => [c._id, c]))

    return txs
      .filter((tx) => !tx.isHidden)
      .slice(0, limit)
      .map((tx) => {
        const account = accountMap.get(tx.accountId)
        const category = tx.categoryId
          ? categoryMap.get(tx.categoryId)
          : undefined
        return {
          _id: tx._id,
          accountId: tx.accountId,
          date: tx.date,
          amount: tx.amount,
          merchantName: tx.merchantName,
          originalDescription: tx.originalDescription,
          pending: tx.pending,
          categoryId: tx.categoryId,
          categorySource: tx.categorySource,
          isTransfer: tx.isTransfer,
          isHidden: tx.isHidden,
          notes: tx.notes,
          tags: tx.tags,
          accountName: account?.name,
          categoryName: category?.name,
          categoryColor: category?.color,
        }
      })
  },
})

export const updateCategory = authedMutation({
  args: {
    transactionId: v.id('transactions'),
    categoryId: v.id('categories'),
    createRule: v.optional(v.boolean()),
    applyRetroactively: v.optional(v.boolean()),
  },
  returns: v.object({
    ruleId: v.optional(v.id('categoryRules')),
    updatedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId)
    if (!tx || tx.userId !== ctx.user._id) throw new Error('Not found')

    const category = await ctx.db.get(args.categoryId)
    if (!category || category.userId !== ctx.user._id)
      throw new Error('Category not found')

    await ctx.db.patch(args.transactionId, {
      categoryId: args.categoryId,
      categorySource: 'user',
      isTransfer: category.budgetType === 'transfer',
    })

    let ruleId
    let updatedCount = 1

    if (args.createRule && tx.merchantName) {
      ruleId = await ctx.db.insert('categoryRules', {
        userId: ctx.user._id,
        matcher: { merchantName: tx.merchantName },
        categoryId: args.categoryId,
        priority: 10,
        createdFrom: 'correction',
        timesApplied: 1,
        isActive: true,
      })

      if (args.applyRetroactively) {
        const matches = await ctx.db
          .query('transactions')
          .withIndex('by_user_merchant', (q) =>
            q.eq('userId', ctx.user._id).eq('merchantName', tx.merchantName),
          )
          .collect()
        for (const match of matches) {
          if (match._id === tx._id) continue
          if (match.categorySource === 'user') continue
          await ctx.db.patch(match._id, {
            categoryId: args.categoryId,
            categorySource: 'rule',
            isTransfer: category.budgetType === 'transfer',
          })
          updatedCount++
        }
        if (ruleId) {
          await ctx.db.patch(ruleId, { timesApplied: updatedCount })
        }
      }
    }

    return { ruleId, updatedCount }
  },
})

export const updateMeta = authedMutation({
  args: {
    transactionId: v.id('transactions'),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isHidden: v.optional(v.boolean()),
    isTransfer: v.optional(v.boolean()),
    merchantName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId)
    if (!tx || tx.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.patch(args.transactionId, {
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      ...(args.tags !== undefined ? { tags: args.tags } : {}),
      ...(args.isHidden !== undefined ? { isHidden: args.isHidden } : {}),
      ...(args.isTransfer !== undefined ? { isTransfer: args.isTransfer } : {}),
      ...(args.merchantName !== undefined
        ? { merchantName: args.merchantName }
        : {}),
    })
    return null
  },
})

export const spendingByCategory = authedQuery({
  args: { month: v.string() },
  returns: v.array(
    v.object({
      categoryId: v.union(v.id('categories'), v.null()),
      name: v.string(),
      color: v.string(),
      amount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const { start, end } = monthBounds(args.month)
    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', ctx.user._id).gte('date', start).lte('date', end),
      )
      .collect()

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const categoryMap = new Map(categories.map((c) => [c._id, c]))

    const totals = new Map<string, number>()
    for (const tx of txs) {
      if (tx.isTransfer || tx.isHidden || tx.amount <= 0) continue
      const key = tx.categoryId ?? 'none'
      totals.set(key, (totals.get(key) ?? 0) + tx.amount)
    }

    return [...totals.entries()]
      .map(([key, amount]) => {
        if (key === 'none') {
          return {
            categoryId: null,
            name: 'Uncategorized',
            color: '#94a3b8',
            amount,
          }
        }
        const cat = categoryMap.get(key as typeof categories[0]['_id'])
        return {
          categoryId: cat?._id ?? null,
          name: cat?.name ?? 'Unknown',
          color: cat?.color ?? '#94a3b8',
          amount,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  },
})
