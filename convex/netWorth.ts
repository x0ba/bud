import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalMutation, internalQuery } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { authedMutation, authedQuery } from './lib/customFunctions'

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** One point per UTC day; later writes the same day replace the row. */
async function writeSnapshot(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<Id<'netWorthSnapshots'> | null> {
  const accounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const manuals = await ctx.db
    .query('manualAssets')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  let assets = 0
  let liabilities = 0
  const byAccount: Array<{ accountId: Id<'accounts'>; balance: number }> = []

  for (const a of accounts) {
    if (a.isHidden || a.isClosed) continue
    const bal = a.currentBalance
    byAccount.push({ accountId: a._id, balance: bal })
    if (a.type === 'credit' || a.type === 'loan') {
      liabilities += Math.abs(bal)
    } else {
      assets += bal
    }
  }
  for (const m of manuals) {
    if (m.type === 'debt') liabilities += Math.abs(m.value)
    else assets += m.value
  }

  const date = todayKey()
  const existing = await ctx.db
    .query('netWorthSnapshots')
    .withIndex('by_user_date', (q) => q.eq('userId', userId).eq('date', date))
    .unique()

  const hasHoldings = byAccount.length > 0 || manuals.length > 0
  if (!hasHoldings && !existing) return null

  const fields = {
    netWorth: assets - liabilities,
    assets,
    liabilities,
    byAccount,
  }

  if (existing) {
    await ctx.db.patch(existing._id, fields)
    return existing._id
  }

  return await ctx.db.insert('netWorthSnapshots', {
    userId,
    date,
    ...fields,
  })
}

export const summary = authedQuery({
  args: {},
  returns: v.object({
    netWorth: v.number(),
    assets: v.number(),
    liabilities: v.number(),
    accounts: v.array(
      v.object({
        accountId: v.id('accounts'),
        name: v.string(),
        type: v.string(),
        balance: v.number(),
      }),
    ),
    manualAssets: v.array(
      v.object({
        _id: v.id('manualAssets'),
        name: v.string(),
        type: v.union(
          v.literal('property'),
          v.literal('vehicle'),
          v.literal('cash'),
          v.literal('other'),
          v.literal('debt'),
        ),
        value: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
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
    const accountRows = []

    for (const a of accounts) {
      if (a.isHidden || a.isClosed) continue
      const bal = a.currentBalance
      accountRows.push({
        accountId: a._id,
        name: a.name,
        type: a.type,
        balance: bal,
      })
      if (a.type === 'credit' || a.type === 'loan') {
        liabilities += Math.abs(bal)
      } else {
        assets += bal
      }
    }

    for (const m of manuals) {
      if (m.type === 'debt') liabilities += Math.abs(m.value)
      else assets += m.value
    }

    return {
      netWorth: assets - liabilities,
      assets,
      liabilities,
      accounts: accountRows,
      manualAssets: manuals.map((m) => ({
        _id: m._id,
        name: m.name,
        type: m.type,
        value: m.value,
      })),
    }
  },
})

export const history = authedQuery({
  args: {
    range: v.optional(
      v.union(
        v.literal('1M'),
        v.literal('3M'),
        v.literal('YTD'),
        v.literal('1Y'),
        v.literal('ALL'),
      ),
    ),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      netWorth: v.number(),
      assets: v.number(),
      liabilities: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const range = args.range ?? '3M'
    const snapshots = await ctx.db
      .query('netWorthSnapshots')
      .withIndex('by_user_date', (q) => q.eq('userId', ctx.user._id))
      .order('asc')
      .collect()

    const now = new Date()
    let cutoff = '0000-01-01'
    if (range === '1M') {
      const d = new Date(now)
      d.setUTCMonth(d.getUTCMonth() - 1)
      cutoff = d.toISOString().slice(0, 10)
    } else if (range === '3M') {
      const d = new Date(now)
      d.setUTCMonth(d.getUTCMonth() - 3)
      cutoff = d.toISOString().slice(0, 10)
    } else if (range === 'YTD') {
      cutoff = `${now.getUTCFullYear()}-01-01`
    } else if (range === '1Y') {
      const d = new Date(now)
      d.setUTCFullYear(d.getUTCFullYear() - 1)
      cutoff = d.toISOString().slice(0, 10)
    }

    return snapshots
      .filter((s) => s.date >= cutoff)
      .map((s) => ({
        date: s.date,
        netWorth: s.netWorth,
        assets: s.assets,
        liabilities: s.liabilities,
      }))
  },
})

export const addManualAsset = authedMutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal('property'),
      v.literal('vehicle'),
      v.literal('cash'),
      v.literal('other'),
      v.literal('debt'),
    ),
    value: v.number(),
  },
  returns: v.id('manualAssets'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('manualAssets', {
      userId: ctx.user._id,
      name: args.name,
      type: args.type,
      value: args.value,
      valueUpdatedAt: Date.now(),
    })
    await writeSnapshot(ctx, ctx.user._id)
    return id
  },
})

export const updateManualAsset = authedMutation({
  args: {
    id: v.id('manualAssets'),
    name: v.optional(v.string()),
    value: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.id)
    if (!asset || asset.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.patch(args.id, {
      ...(args.name != null ? { name: args.name } : {}),
      ...(args.value != null
        ? { value: args.value, valueUpdatedAt: Date.now() }
        : {}),
    })
    await writeSnapshot(ctx, ctx.user._id)
    return null
  },
})

export const removeManualAsset = authedMutation({
  args: { id: v.id('manualAssets') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.id)
    if (!asset || asset.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.delete(args.id)
    await writeSnapshot(ctx, ctx.user._id)
    return null
  },
})

export const snapshotNow = authedMutation({
  args: {},
  returns: v.union(v.id('netWorthSnapshots'), v.null()),
  handler: async (ctx) => {
    return await writeSnapshot(ctx, ctx.user._id)
  },
})

export const listUserIds = internalQuery({
  args: {},
  returns: v.array(v.id('users')),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.map((u) => u._id)
  },
})

export const snapshotUser = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await writeSnapshot(ctx, args.userId)
    return null
  },
})

export const snapshotAllUsers = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      await ctx.scheduler.runAfter(0, internal.netWorth.snapshotUser, {
        userId: user._id,
      })
    }
    return null
  },
})
