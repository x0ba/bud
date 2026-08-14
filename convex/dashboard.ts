import { v } from 'convex/values'
import { authedQuery } from './lib/customFunctions'
import {
  countsTowardSpending,
  daysInMonth,
  monthBounds,
  monthKey,
  shiftMonth,
} from './lib/money'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

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
        categoryId: v.optional(v.id('categories')),
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
          categoryId: t.categoryId,
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

const pacePoint = v.object({
  day: v.number(),
  cumulative: v.number(),
})

async function cumulativeSpend(
  ctx: QueryCtx,
  userId: Id<'users'>,
  month: string,
  throughDay: number,
): Promise<Array<{ day: number; cumulative: number }>> {
  const { start, end } = monthBounds(month)
  const txs = await ctx.db
    .query('transactions')
    .withIndex('by_user_date', (q) =>
      q.eq('userId', userId).gte('date', start).lte('date', end),
    )
    .collect()

  const daily = new Array<number>(throughDay + 1).fill(0)
  for (const tx of txs) {
    if (!countsTowardSpending(tx)) continue
    const day = Number(tx.date.slice(8, 10))
    if (day >= 1 && day <= throughDay) daily[day] += tx.amount
  }

  const series: Array<{ day: number; cumulative: number }> = []
  let running = 0
  for (let day = 1; day <= throughDay; day++) {
    running += daily[day] ?? 0
    series.push({ day, cumulative: running })
  }
  return series
}

/**
 * Cumulative daily spend for this month, last month, and the same month last
 * year. `today` is passed in so the query stays deterministic.
 */
export const spendingPace = authedQuery({
  args: {
    month: v.string(),
    today: v.string(),
  },
  returns: v.object({
    month: v.string(),
    throughDay: v.number(),
    daysInMonth: v.number(),
    thisMonth: v.array(pacePoint),
    lastMonth: v.array(pacePoint),
    lastYear: v.array(pacePoint),
    spentThisMonth: v.number(),
  }),
  handler: async (ctx, args) => {
    const days = daysInMonth(args.month)
    const todayMonth = args.today.slice(0, 7)
    const todayDay = Number(args.today.slice(8, 10))
    const throughDay =
      todayMonth === args.month
        ? Math.min(days, Math.max(1, todayDay))
        : days

    const lastMonthKey = shiftMonth(args.month, -1)
    const lastYearKey = shiftMonth(args.month, -12)

    const [thisMonth, lastMonth, lastYear] = await Promise.all([
      cumulativeSpend(ctx, ctx.user._id, args.month, throughDay),
      cumulativeSpend(ctx, ctx.user._id, lastMonthKey, daysInMonth(lastMonthKey)),
      cumulativeSpend(ctx, ctx.user._id, lastYearKey, daysInMonth(lastYearKey)),
    ])

    return {
      month: args.month,
      throughDay,
      daysInMonth: days,
      thisMonth,
      lastMonth,
      lastYear,
      spentThisMonth: thisMonth.at(-1)?.cumulative ?? 0,
    }
  },
})
