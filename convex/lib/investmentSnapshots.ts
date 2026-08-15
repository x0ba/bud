import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { currentMarkPrice, markValue } from './market'

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** One point per UTC day; later writes the same day replace the row. */
export async function writeInvestmentSnapshot(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<Id<'investmentSnapshots'> | null> {
  const accounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const holdings = await ctx.db
    .query('holdings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const investmentAccounts = accounts.filter(
    (account) =>
      account.type === 'investment' && !account.isHidden && !account.isClosed,
  )
  const investmentIds = new Set(
    investmentAccounts.map((account) => account._id),
  )
  const activeHoldings = holdings.filter((holding) =>
    investmentIds.has(holding.accountId),
  )

  const byAccountMap = new Map<Id<'accounts'>, number>()
  const byHolding: Array<{
    holdingId: Id<'holdings'>
    accountId: Id<'accounts'>
    securityId: Id<'securities'>
    value: number
  }> = []

  for (const holding of activeHoldings) {
    const security = await ctx.db.get(holding.securityId)
    const value = markValue(
      holding.quantity,
      currentMarkPrice({
        livePrice: security?.livePrice,
        closePrice: security?.closePrice,
        institutionPrice: holding.institutionPrice,
      }),
      holding.institutionValue,
    )
    byHolding.push({
      holdingId: holding._id,
      accountId: holding.accountId,
      securityId: holding.securityId,
      value,
    })
    byAccountMap.set(
      holding.accountId,
      (byAccountMap.get(holding.accountId) ?? 0) + value,
    )
  }

  for (const account of investmentAccounts) {
    if (!byAccountMap.has(account._id)) {
      byAccountMap.set(account._id, account.currentBalance)
    }
  }

  const byAccount = [...byAccountMap.entries()].map(([accountId, value]) => ({
    accountId,
    value,
  }))
  const totalValue = byAccount.reduce((sum, row) => sum + row.value, 0)

  const date = todayKey()
  const existing = await ctx.db
    .query('investmentSnapshots')
    .withIndex('by_user_date', (q) => q.eq('userId', userId).eq('date', date))
    .unique()

  const hasInvestments =
    investmentAccounts.length > 0 || activeHoldings.length > 0
  if (!hasInvestments && !existing) return null

  const fields = { totalValue, byAccount, byHolding }

  if (existing) {
    await ctx.db.patch(existing._id, fields)
    return existing._id
  }

  return await ctx.db.insert('investmentSnapshots', {
    userId,
    date,
    ...fields,
  })
}
