import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { findCategoryByPlaidPrimary } from './categories'

type RuleCtx = QueryCtx | MutationCtx
// MutationCtx retained for write-path callers

export type IngestFields = {
  merchantName?: string | null
  originalDescription: string
  accountId: Id<'accounts'>
  amount: number
  plaidCategoryPrimary?: string | null
}

function specificity(rule: Doc<'categoryRules'>): number {
  const m = rule.matcher
  let score = 0
  if (m.merchantName && m.accountId) score += 100
  else if (m.merchantName) score += 80
  if (m.descriptionContains) score += 40
  if (m.plaidCategory) score += 20
  if (m.accountId && !m.merchantName) score += 10
  if (m.amountMin != null || m.amountMax != null) score += 5
  return score + rule.priority
}

function matches(rule: Doc<'categoryRules'>, tx: IngestFields): boolean {
  const m = rule.matcher
  if (m.merchantName) {
    const name = (tx.merchantName ?? '').toLowerCase()
    if (name !== m.merchantName.toLowerCase()) return false
  }
  if (m.descriptionContains) {
    if (
      !tx.originalDescription
        .toLowerCase()
        .includes(m.descriptionContains.toLowerCase())
    ) {
      return false
    }
  }
  if (m.plaidCategory) {
    if ((tx.plaidCategoryPrimary ?? '') !== m.plaidCategory) return false
  }
  if (m.accountId && m.accountId !== tx.accountId) return false
  if (m.amountMin != null && tx.amount < m.amountMin) return false
  if (m.amountMax != null && tx.amount > m.amountMax) return false
  return true
}

export async function resolveCategory(
  ctx: RuleCtx,
  userId: Id<'users'>,
  tx: IngestFields,
): Promise<{
  categoryId?: Id<'categories'>
  categorySource: 'plaid' | 'rule' | 'user'
  merchantName?: string
  ruleId?: Id<'categoryRules'>
}> {
  const rules = await ctx.db
    .query('categoryRules')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const active = rules
    .filter((r) => r.isActive)
    .sort((a, b) => specificity(b) - specificity(a))

  for (const rule of active) {
    if (matches(rule, tx)) {
      return {
        categoryId: rule.categoryId,
        categorySource: 'rule',
        merchantName: rule.merchantRename ?? tx.merchantName ?? undefined,
        ruleId: rule._id,
      }
    }
  }

  const categoryId = await findCategoryByPlaidPrimary(
    ctx,
    userId,
    tx.plaidCategoryPrimary,
  )

  return {
    categoryId,
    categorySource: 'plaid',
    merchantName: tx.merchantName ?? undefined,
  }
}

export function looksLikeTransfer(tx: {
  plaidCategoryPrimary?: string | null
  plaidCategoryDetailed?: string | null
  merchantName?: string | null
  originalDescription: string
}): boolean {
  const primary = tx.plaidCategoryPrimary ?? ''
  if (primary.startsWith('TRANSFER')) return true
  if (primary === 'LOAN_PAYMENTS') return true
  const text =
    `${tx.merchantName ?? ''} ${tx.originalDescription}`.toLowerCase()
  return (
    text.includes('payment thank you') ||
    text.includes('autopay') ||
    text.includes('credit card payment') ||
    text.includes('ach payment')
  )
}
