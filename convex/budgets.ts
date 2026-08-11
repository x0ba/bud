import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { dayOfMonthProgress, monthBounds, monthKey } from './lib/money'

export const getMonth = authedQuery({
  args: { month: v.optional(v.string()) },
  returns: v.object({
    month: v.string(),
    budgetId: v.union(v.id('budgets'), v.null()),
    expectedIncome: v.optional(v.number()),
    flexBudget: v.optional(v.number()),
    pace: v.object({
      day: v.number(),
      daysInMonth: v.number(),
      pct: v.number(),
    }),
    items: v.array(
      v.object({
        categoryId: v.id('categories'),
        name: v.string(),
        color: v.string(),
        budgetType: v.union(
          v.literal('fixed'),
          v.literal('flex'),
          v.literal('non_monthly'),
          v.literal('income'),
          v.literal('transfer'),
        ),
        planned: v.number(),
        spent: v.number(),
        rollover: v.optional(v.boolean()),
      }),
    ),
    totals: v.object({
      income: v.number(),
      spent: v.number(),
      fixedPlanned: v.number(),
      flexPlanned: v.number(),
      flexSpent: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const month = args.month ?? monthKey()
    const { start, end } = monthBounds(month)
    const pace = dayOfMonthProgress()

    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_user_month', (q) =>
        q.eq('userId', ctx.user._id).eq('month', month),
      )
      .unique()

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()

    const budgetItems = budget
      ? await ctx.db
          .query('budgetItems')
          .withIndex('by_budget', (q) => q.eq('budgetId', budget._id))
          .collect()
      : []
    const plannedByCat = new Map(
      budgetItems.map((i) => [i.categoryId, i]),
    )

    const txs = await ctx.db
      .query('transactions')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', ctx.user._id).gte('date', start).lte('date', end),
      )
      .collect()

    let income = 0
    let spent = 0
    const spentByCat = new Map<string, number>()

    for (const tx of txs) {
      if (tx.isHidden) continue
      if (tx.amount < 0) {
        income += Math.abs(tx.amount)
        continue
      }
      if (tx.isTransfer) continue
      spent += tx.amount
      if (tx.categoryId) {
        spentByCat.set(
          tx.categoryId,
          (spentByCat.get(tx.categoryId) ?? 0) + tx.amount,
        )
      }
    }

    const expenseCats = categories.filter(
      (c) =>
        !c.excludeFromBudget &&
        (c.budgetType === 'fixed' ||
          c.budgetType === 'flex' ||
          c.budgetType === 'non_monthly'),
    )

    const items = expenseCats.map((c) => {
      const planned = plannedByCat.get(c._id)
      return {
        categoryId: c._id,
        name: c.name,
        color: c.color,
        budgetType: c.budgetType,
        planned: planned?.amount ?? 0,
        spent: spentByCat.get(c._id) ?? 0,
        rollover: planned?.rollover,
      }
    })

    const fixedPlanned = items
      .filter((i) => i.budgetType === 'fixed')
      .reduce((s, i) => s + i.planned, 0)
    const flexSpent = items
      .filter((i) => i.budgetType === 'flex')
      .reduce((s, i) => s + i.spent, 0)
    const flexPlanned =
      budget?.flexBudget ??
      items
        .filter((i) => i.budgetType === 'flex')
        .reduce((s, i) => s + i.planned, 0)

    return {
      month,
      budgetId: budget?._id ?? null,
      expectedIncome: budget?.expectedIncome,
      flexBudget: budget?.flexBudget,
      pace,
      items: items.sort((a, b) => b.spent - a.spent),
      totals: {
        income,
        spent,
        fixedPlanned,
        flexPlanned,
        flexSpent,
      },
    }
  },
})

export const upsert = authedMutation({
  args: {
    month: v.string(),
    expectedIncome: v.optional(v.number()),
    flexBudget: v.optional(v.number()),
    items: v.array(
      v.object({
        categoryId: v.id('categories'),
        amount: v.number(),
        rollover: v.optional(v.boolean()),
      }),
    ),
  },
  returns: v.id('budgets'),
  handler: async (ctx, args) => {
    let budget = await ctx.db
      .query('budgets')
      .withIndex('by_user_month', (q) =>
        q.eq('userId', ctx.user._id).eq('month', args.month),
      )
      .unique()

    if (budget) {
      await ctx.db.patch(budget._id, {
        expectedIncome: args.expectedIncome,
        flexBudget: args.flexBudget,
      })
    } else {
      const budgetId = await ctx.db.insert('budgets', {
        userId: ctx.user._id,
        month: args.month,
        expectedIncome: args.expectedIncome,
        flexBudget: args.flexBudget,
      })
      budget = await ctx.db.get(budgetId)
    }
    if (!budget) throw new Error('Failed to upsert budget')

    const existing = await ctx.db
      .query('budgetItems')
      .withIndex('by_budget', (q) => q.eq('budgetId', budget!._id))
      .collect()
    const existingMap = new Map(existing.map((e) => [e.categoryId, e]))

    for (const item of args.items) {
      const prev = existingMap.get(item.categoryId)
      if (prev) {
        await ctx.db.patch(prev._id, {
          amount: item.amount,
          rollover: item.rollover,
        })
        existingMap.delete(item.categoryId)
      } else {
        await ctx.db.insert('budgetItems', {
          budgetId: budget._id,
          categoryId: item.categoryId,
          amount: item.amount,
          rollover: item.rollover,
        })
      }
    }

    for (const leftover of existingMap.values()) {
      await ctx.db.delete(leftover._id)
    }

    return budget._id
  },
})

export const copyFromPrevious = authedMutation({
  args: { month: v.string() },
  returns: v.union(v.id('budgets'), v.null()),
  handler: async (ctx, args) => {
    const [y, m] = args.month.split('-').map(Number)
    const prevDate = new Date(Date.UTC(y!, m! - 2, 1))
    const prevMonth = monthKey(prevDate)

    const prev = await ctx.db
      .query('budgets')
      .withIndex('by_user_month', (q) =>
        q.eq('userId', ctx.user._id).eq('month', prevMonth),
      )
      .unique()
    if (!prev) return null

    const items = await ctx.db
      .query('budgetItems')
      .withIndex('by_budget', (q) => q.eq('budgetId', prev._id))
      .collect()

    let budget = await ctx.db
      .query('budgets')
      .withIndex('by_user_month', (q) =>
        q.eq('userId', ctx.user._id).eq('month', args.month),
      )
      .unique()

    if (!budget) {
      const id = await ctx.db.insert('budgets', {
        userId: ctx.user._id,
        month: args.month,
        expectedIncome: prev.expectedIncome,
        flexBudget: prev.flexBudget,
      })
      budget = await ctx.db.get(id)
    } else {
      await ctx.db.patch(budget._id, {
        expectedIncome: prev.expectedIncome,
        flexBudget: prev.flexBudget,
      })
    }
    if (!budget) return null

    const existing = await ctx.db
      .query('budgetItems')
      .withIndex('by_budget', (q) => q.eq('budgetId', budget!._id))
      .collect()
    for (const e of existing) await ctx.db.delete(e._id)

    for (const item of items) {
      await ctx.db.insert('budgetItems', {
        budgetId: budget._id,
        categoryId: item.categoryId,
        amount: item.amount,
        rollover: item.rollover,
      })
    }

    return budget._id
  },
})
