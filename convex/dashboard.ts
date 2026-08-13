import { v } from 'convex/values'
import { authedQuery } from './lib/customFunctions'
import { monthBounds, monthKey } from './lib/money'

export const overview = authedQuery({
  args: {},
  returns: v.object({
    month: v.string(),
    netWorth: v.number(),
    spentThisMonth: v.number(),
    incomeThisMonth: v.number(),
    flexBudget: v.optional(v.number()),
    flexSpent: v.number(),
    topCategories: v.array(
      v.object({
        name: v.string(),
        color: v.string(),
        amount: v.number(),
      }),
    ),
    creditDue: v.array(
      v.object({
        accountId: v.id('accounts'),
        name: v.string(),
        dueDate: v.optional(v.string()),
        balance: v.number(),
        minimumPayment: v.optional(v.number()),
        isOverdue: v.optional(v.boolean()),
      }),
    ),
    itemAlerts: v.array(
      v.object({
        itemId: v.id('plaidItems'),
        institutionName: v.string(),
        status: v.union(
          v.literal('ok'),
          v.literal('login_required'),
          v.literal('error'),
        ),
        errorMessage: v.optional(v.string()),
      }),
    ),
    recent: v.array(
      v.object({
        _id: v.id('transactions'),
        date: v.string(),
        amount: v.number(),
        merchantName: v.optional(v.string()),
        categoryName: v.optional(v.string()),
        categoryColor: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx) => {
    const month = monthKey()
    const { start, end } = monthBounds(month)

    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const manuals = await ctx.db
      .query('manualAssets')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()

    let assets = 0
    let liabilities = 0
    for (const a of accounts) {
      if (a.isHidden || a.isClosed) continue
      if (a.type === 'credit' || a.type === 'loan')
        liabilities += Math.abs(a.currentBalance)
      else assets += a.currentBalance
    }
    for (const m of manuals) {
      if (m.type === 'debt') liabilities += Math.abs(m.value)
      else assets += m.value
    }

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
    const catMap = new Map(categories.map((c) => [c._id, c]))

    let spentThisMonth = 0
    let incomeThisMonth = 0
    let flexSpent = 0
    const byCat = new Map<string, number>()

    for (const tx of txs) {
      if (tx.isHidden) continue
      if (tx.amount < 0) {
        incomeThisMonth += Math.abs(tx.amount)
        continue
      }
      if (tx.isTransfer) continue
      spentThisMonth += tx.amount
      if (tx.categoryId) {
        const cat = catMap.get(tx.categoryId)
        if (cat?.budgetType === 'flex') flexSpent += tx.amount
        byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + tx.amount)
      }
    }

    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_user_month', (q) =>
        q.eq('userId', ctx.user._id).eq('month', month),
      )
      .unique()

    const topCategories = [...byCat.entries()]
      .map(([id, amount]) => {
        const cat = catMap.get(id as (typeof categories)[0]['_id'])
        return {
          name: cat?.name ?? 'Unknown',
          color: cat?.color ?? '#94a3b8',
          amount,
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    const creditDue = accounts
      .filter((a) => a.type === 'credit' && !a.isHidden && !a.isClosed)
      .map((a) => ({
        accountId: a._id,
        name: a.name,
        dueDate: a.nextPaymentDueDate,
        balance: a.currentBalance,
        minimumPayment: a.minimumPayment,
        isOverdue: a.isOverdue,
      }))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      .slice(0, 4)

    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const itemAlerts = items
      .filter((i) => i.status !== 'ok')
      .map((i) => ({
        itemId: i._id,
        institutionName: i.institutionName,
        status: i.status,
        errorMessage: i.errorMessage,
      }))

    const recentTxs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
      .order('desc')
      .take(20)

    const recent = recentTxs
      .filter((t) => !t.isHidden)
      .slice(0, 6)
      .map((t) => {
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined
        return {
          _id: t._id,
          date: t.date,
          amount: t.amount,
          merchantName: t.merchantName ?? t.originalDescription,
          categoryName: cat?.name,
          categoryColor: cat?.color,
        }
      })

    return {
      month,
      netWorth: assets - liabilities,
      spentThisMonth,
      incomeThisMonth,
      flexBudget: budget?.flexBudget,
      flexSpent,
      topCategories,
      creditDue,
      itemAlerts,
      recent,
    }
  },
})
