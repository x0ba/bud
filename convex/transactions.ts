import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { expenseAmount, incomeAmount, monthBounds } from './lib/money'

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

type ListFilterArgs = {
  userId: Id<'users'>
  accountId?: Id<'accounts'>
  categoryId?: Id<'categories'>
  search?: string
  includeHidden?: boolean
  includeTransfers?: boolean
}

function transactionMatchesFilters(
  tx: Doc<'transactions'>,
  args: ListFilterArgs,
): boolean {
  if (tx.userId !== args.userId) return false
  if (args.accountId && tx.accountId !== args.accountId) return false
  if (args.categoryId && tx.categoryId !== args.categoryId) return false
  if (!args.includeHidden && tx.isHidden) return false
  if (!args.includeTransfers && tx.isTransfer) return false
  if (args.search) {
    const hay =
      `${tx.merchantName ?? ''} ${tx.originalDescription}`.toLowerCase()
    if (!hay.includes(args.search)) return false
  }
  return true
}

async function paginateFilteredTransactions(
  ctx: QueryCtx,
  userId: Id<'users'>,
  args: ListFilterArgs & {
    paginationOpts: { numItems: number; cursor: string | null }
  },
) {
  const pageSize = args.paginationOpts.numItems
  let cursor = args.paginationOpts.cursor
  const filtered: Doc<'transactions'>[] = []
  let isDone = false
  let continueCursor = ''
  const bounds = args.month ? monthBounds(args.month) : null
  const search = args.search?.toLowerCase().trim()

  const queryPage = () => {
    if (args.categoryId && bounds) {
      return ctx.db
        .query('transactions')
        .withIndex('by_user_category_date', (q) =>
          q
            .eq('userId', userId)
            .eq('categoryId', args.categoryId!)
            .gte('date', bounds.start)
            .lte('date', bounds.end),
        )
        .order('desc')
    }
    if (args.categoryId) {
      return ctx.db
        .query('transactions')
        .withIndex('by_user_category_date', (q) =>
          q.eq('userId', userId).eq('categoryId', args.categoryId!),
        )
        .order('desc')
    }
    if (args.accountId && bounds) {
      return ctx.db
        .query('transactions')
        .withIndex('by_account_date', (q) =>
          q
            .eq('accountId', args.accountId!)
            .gte('date', bounds.start)
            .lte('date', bounds.end),
        )
        .order('desc')
    }
    if (args.accountId) {
      return ctx.db
        .query('transactions')
        .withIndex('by_account_date', (q) =>
          q.eq('accountId', args.accountId!),
        )
        .order('desc')
    }
    if (bounds) {
      return ctx.db
        .query('transactions')
        .withIndex('by_user_date', (q) =>
          q
            .eq('userId', userId)
            .gte('date', bounds.start)
            .lte('date', bounds.end),
        )
        .order('desc')
    }
    return ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) => q.eq('userId', userId))
      .order('desc')
  }

  const filterArgs: ListFilterArgs & { userId: Id<'users'>; search?: string } =
    {
      ...args,
      userId,
      search,
    }

  while (filtered.length < pageSize && !isDone) {
    const result = await queryPage().paginate({ numItems: pageSize, cursor })

    for (const tx of result.page) {
      if (!transactionMatchesFilters(tx, filterArgs)) continue
      filtered.push(tx)
      if (filtered.length >= pageSize) break
    }

    cursor = result.continueCursor
    continueCursor = result.continueCursor
    isDone = result.isDone
  }

  return { page: filtered, isDone, continueCursor }
}

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
    const result = await paginateFilteredTransactions(ctx, ctx.user._id, args)

    const accountIds = [...new Set(result.page.map((tx) => tx.accountId))]
    const categoryIds = [
      ...new Set(
        result.page.flatMap((tx) => (tx.categoryId ? [tx.categoryId] : [])),
      ),
    ]
    const [accounts, categories] = await Promise.all([
      Promise.all(accountIds.map((id) => ctx.db.get(id))),
      Promise.all(categoryIds.map((id) => ctx.db.get(id))),
    ])
    const accountMap = new Map<Id<'accounts'>, Doc<'accounts'>>()
    for (const account of accounts) {
      if (account) accountMap.set(account._id, account)
    }
    const categoryMap = new Map<Id<'categories'>, Doc<'categories'>>()
    for (const category of categories) {
      if (category) categoryMap.set(category._id, category)
    }

    const page = result.page.map((tx) => {
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

/** Month (and optional account) flow totals — cacheable via prewarm on nav hover. */
export const flowSummary = authedQuery({
  args: {
    month: v.string(),
    accountId: v.optional(v.id('accounts')),
    includeHidden: v.optional(v.boolean()),
    includeTransfers: v.optional(v.boolean()),
  },
  returns: v.object({
    out: v.number(),
    incoming: v.number(),
  }),
  handler: async (ctx, args) => {
    const { start, end } = monthBounds(args.month)
    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', ctx.user._id).gte('date', start).lte('date', end),
      )
      .collect()

    let out = 0
    let incoming = 0
    for (const tx of txs) {
      if (args.accountId && tx.accountId !== args.accountId) continue
      if (!args.includeHidden && tx.isHidden) continue
      if (!args.includeTransfers && tx.isTransfer) continue
      out += expenseAmount(tx.amount)
      incoming += incomeAmount(tx.amount)
    }
    return { out, incoming }
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

/** Distinct merchant names from recent activity — enough to pick from, bounded. */
export const listMerchants = authedQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .take(400)

    const names = new Set<string>()
    for (const tx of txs) {
      const name = (tx.merchantName ?? tx.originalDescription).trim()
      if (name) names.add(name)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  },
})

/** Mint a Flex category and file the charge in one write so a failed assign cannot orphan it. */
export const createAndAssignCategory = authedMutation({
  args: {
    transactionId: v.id('transactions'),
    name: v.string(),
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId)
    if (!tx || tx.userId !== ctx.user._id) throw new Error('Not found')

    const name = args.name.trim()
    if (!name) throw new Error('Name is required')

    const reused = await ctx.db
      .query('categories')
      .withIndex('by_user_name', (q) =>
        q.eq('userId', ctx.user._id).eq('name', name),
      )
      .first()

    let categoryId = reused?._id
    let budgetType = reused?.budgetType
    if (!categoryId) {
      const existing = await ctx.db
        .query('categories')
        .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
        .collect()
      categoryId = await ctx.db.insert('categories', {
        userId: ctx.user._id,
        name,
        icon: 'tag',
        color: '#c27803',
        isSystem: false,
        budgetType: 'flex',
        excludeFromBudget: false,
        sortOrder: existing.length,
      })
      budgetType = 'flex'
    }

    await ctx.db.patch(args.transactionId, {
      categoryId,
      categorySource: 'user',
      isTransfer: budgetType === 'transfer',
    })

    return categoryId
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
        const cat = categoryMap.get(key as (typeof categories)[0]['_id'])
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
