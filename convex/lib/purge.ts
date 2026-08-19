import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export const PURGE_BATCH = 64

export function withExcludedAccount(
  excluded: Array<string> | undefined,
  plaidAccountId: string,
): Array<string> {
  const next = new Set(excluded ?? [])
  next.add(plaidAccountId)
  return [...next]
}

export function isExcludedAccount(
  excluded: Array<string> | undefined,
  plaidAccountId: string,
): boolean {
  return excluded?.includes(plaidAccountId) === true
}

/**
 * Deletes child rows for an account in batches. Returns false when another
 * pass is needed so the caller can reschedule instead of blowing the
 * mutation write limit.
 */
export async function purgeAccountChildren(
  ctx: MutationCtx,
  args: { accountId: Id<'accounts'>; userId: Id<'users'> },
): Promise<boolean> {
  const txs = await ctx.db
    .query('transactions')
    .withIndex('by_account_date', (q) => q.eq('accountId', args.accountId))
    .take(PURGE_BATCH)
  for (const tx of txs) {
    await ctx.db.delete(tx._id)
  }
  if (txs.length === PURGE_BATCH) return false

  const holdings = await ctx.db
    .query('holdings')
    .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
    .take(PURGE_BATCH)
  for (const holding of holdings) {
    await ctx.db.delete(holding._id)
  }
  if (holdings.length === PURGE_BATCH) return false

  const investmentTxns = await ctx.db
    .query('investmentTxns')
    .withIndex('by_account', (q) => q.eq('accountId', args.accountId))
    .take(PURGE_BATCH)
  for (const txn of investmentTxns) {
    await ctx.db.delete(txn._id)
  }
  if (investmentTxns.length === PURGE_BATCH) return false

  const rules = await ctx.db
    .query('categoryRules')
    .withIndex('by_user_account', (q) =>
      q.eq('userId', args.userId).eq('matcher.accountId', args.accountId),
    )
    .take(PURGE_BATCH)
  for (const rule of rules) {
    await ctx.db.delete(rule._id)
  }
  if (rules.length === PURGE_BATCH) return false

  const account = await ctx.db.get(args.accountId)
  if (account) await ctx.db.delete(args.accountId)

  return true
}
