import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { internalMutation, internalQuery } from './_generated/server'
import {
  findDuplicateAccount,
  sameInstitution,
  type AccountIdentity,
  type InstitutionIdentity,
} from './lib/accountIdentity'
import { writeInvestmentSnapshot } from './lib/investmentSnapshots'
import { looksLikeTransfer, resolveCategory } from './lib/rules'

const accountType = v.union(
  v.literal('depository'),
  v.literal('credit'),
  v.literal('investment'),
  v.literal('loan'),
  v.literal('other'),
)

const linkedAccount = v.object({
  plaidAccountId: v.string(),
  name: v.string(),
  officialName: v.optional(v.string()),
  mask: v.optional(v.string()),
  type: accountType,
  subtype: v.optional(v.string()),
  currentBalance: v.number(),
  availableBalance: v.optional(v.number()),
  limit: v.optional(v.number()),
  isoCurrency: v.string(),
})

type LinkedAccount = Infer<typeof linkedAccount>

async function institutionAccounts(
  ctx: MutationCtx,
  userId: Id<'users'>,
  institution: InstitutionIdentity,
): Promise<Array<Doc<'accounts'>>> {
  const items = await ctx.db
    .query('plaidItems')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const itemIds = new Set(
    items
      .filter((item) => sameInstitution(item, institution))
      .map((item) => item._id),
  )
  if (itemIds.size === 0) return []

  const accounts = await ctx.db
    .query('accounts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  return accounts.filter((account) => itemIds.has(account.itemId))
}

async function findInstitutionItem(
  ctx: MutationCtx,
  userId: Id<'users'>,
  institution: InstitutionIdentity,
  exceptItemId?: Id<'plaidItems'>,
): Promise<Id<'plaidItems'> | null> {
  const items = await ctx.db
    .query('plaidItems')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const match = items.find(
    (item) => item._id !== exceptItemId && sameInstitution(item, institution),
  )
  return match?._id ?? null
}

function identityOf(account: LinkedAccount): AccountIdentity {
  return {
    plaidAccountId: account.plaidAccountId,
    name: account.name,
    officialName: account.officialName,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
  }
}

async function upsertLinkedAccount(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>
    itemId: Id<'plaidItems'>
    account: LinkedAccount
    candidates: Array<Doc<'accounts'>>
  },
): Promise<'inserted' | 'updated'> {
  const existing = findDuplicateAccount(
    identityOf(args.account),
    args.candidates,
  )
  if (existing) {
    const sameConnection =
      existing.itemId === args.itemId ||
      existing.plaidAccountId === args.account.plaidAccountId
    if (sameConnection) {
      await ctx.db.patch(existing._id, {
        name: args.account.name,
        officialName: args.account.officialName,
        mask: args.account.mask,
        type: args.account.type,
        subtype: args.account.subtype,
        currentBalance: args.account.currentBalance,
        availableBalance: args.account.availableBalance,
        limit: args.account.limit,
        isoCurrency: args.account.isoCurrency,
        itemId: args.itemId,
        plaidAccountId: args.account.plaidAccountId,
      })
    } else {
      await ctx.db.patch(existing._id, {
        name: args.account.name,
        officialName: args.account.officialName,
        currentBalance: args.account.currentBalance,
        availableBalance: args.account.availableBalance,
        limit: args.account.limit,
      })
    }
    return 'updated'
  }

  const accountId = await ctx.db.insert('accounts', {
    userId: args.userId,
    itemId: args.itemId,
    plaidAccountId: args.account.plaidAccountId,
    name: args.account.name,
    officialName: args.account.officialName,
    mask: args.account.mask,
    type: args.account.type,
    subtype: args.account.subtype,
    currentBalance: args.account.currentBalance,
    availableBalance: args.account.availableBalance,
    limit: args.account.limit,
    isoCurrency: args.account.isoCurrency,
    isHidden: false,
    isClosed: false,
  })
  args.candidates.push({
    _id: accountId,
    _creationTime: 0,
    userId: args.userId,
    itemId: args.itemId,
    plaidAccountId: args.account.plaidAccountId,
    name: args.account.name,
    officialName: args.account.officialName,
    mask: args.account.mask,
    type: args.account.type,
    subtype: args.account.subtype,
    currentBalance: args.account.currentBalance,
    availableBalance: args.account.availableBalance,
    limit: args.account.limit,
    isoCurrency: args.account.isoCurrency,
    isHidden: false,
    isClosed: false,
  })
  return 'inserted'
}

const syncedTransaction = v.object({
  transaction_id: v.string(),
  account_id: v.string(),
  amount: v.number(),
  date: v.string(),
  authorized_date: v.union(v.string(), v.null()),
  name: v.string(),
  merchant_name: v.union(v.string(), v.null()),
  original_description: v.string(),
  pending: v.boolean(),
  pending_transaction_id: v.union(v.string(), v.null()),
  iso_currency_code: v.string(),
  personal_finance_category: v.union(
    v.object({
      primary: v.string(),
      detailed: v.string(),
    }),
    v.null(),
  ),
})

export const getItemByPlaidId = internalQuery({
  args: { plaidItemId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('plaidItems'),
      userId: v.id('users'),
      accessToken: v.string(),
      syncCursor: v.optional(v.string()),
      status: v.union(
        v.literal('ok'),
        v.literal('login_required'),
        v.literal('error'),
      ),
      institutionName: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query('plaidItems')
      .withIndex('by_plaid_item_id', (q) =>
        q.eq('plaidItemId', args.plaidItemId),
      )
      .unique()
    if (!item) return null
    return {
      _id: item._id,
      userId: item.userId,
      accessToken: item.accessToken,
      syncCursor: item.syncCursor,
      status: item.status,
      institutionName: item.institutionName,
    }
  },
})

export const getItemInternal = internalQuery({
  args: { itemId: v.id('plaidItems') },
  returns: v.union(
    v.object({
      _id: v.id('plaidItems'),
      userId: v.id('users'),
      accessToken: v.string(),
      syncCursor: v.optional(v.string()),
      plaidItemId: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) return null
    return {
      _id: item._id,
      userId: item.userId,
      accessToken: item.accessToken,
      syncCursor: item.syncCursor,
      plaidItemId: item.plaidItemId,
    }
  },
})

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    return user?._id ?? null
  },
})

export const storeItemAndAccounts = internalMutation({
  args: {
    userId: v.id('users'),
    plaidItemId: v.string(),
    accessToken: v.string(),
    institutionId: v.optional(v.string()),
    institutionName: v.string(),
    accounts: v.array(linkedAccount),
  },
  returns: v.object({
    itemId: v.id('plaidItems'),
    insertedAccountCount: v.number(),
    discardedAccessToken: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('plaidItems')
      .withIndex('by_plaid_item_id', (q) =>
        q.eq('plaidItemId', args.plaidItemId),
      )
      .unique()

    const institution = {
      institutionId: args.institutionId,
      institutionName: args.institutionName,
    }

    let itemId = existing?._id
    let createdItem = false
    if (itemId) {
      await ctx.db.patch(itemId, {
        accessToken: args.accessToken,
        institutionId: args.institutionId,
        institutionName: args.institutionName,
        status: 'ok',
        errorCode: undefined,
        errorMessage: undefined,
      })
    } else {
      itemId = await ctx.db.insert('plaidItems', {
        userId: args.userId,
        plaidItemId: args.plaidItemId,
        accessToken: args.accessToken,
        institutionId: args.institutionId,
        institutionName: args.institutionName,
        status: 'ok',
      })
      createdItem = true
    }

    const candidates = await institutionAccounts(ctx, args.userId, institution)
    let insertedAccountCount = 0
    for (const acct of args.accounts) {
      const result = await upsertLinkedAccount(ctx, {
        userId: args.userId,
        itemId,
        account: acct,
        candidates,
      })
      if (result === 'inserted') insertedAccountCount++
    }

    if (createdItem && insertedAccountCount === 0) {
      const existingItemId = await findInstitutionItem(
        ctx,
        args.userId,
        institution,
        itemId,
      )
      if (existingItemId) {
        await ctx.db.delete(itemId)
        await ctx.scheduler.runAfter(0, internal.netWorth.snapshotUser, {
          userId: args.userId,
        })
        return {
          itemId: existingItemId,
          insertedAccountCount,
          discardedAccessToken: args.accessToken,
        }
      }
    }

    await ctx.scheduler.runAfter(0, internal.netWorth.snapshotUser, {
      userId: args.userId,
    })
    return { itemId, insertedAccountCount }
  },
})

export const upsertAccounts = internalMutation({
  args: {
    userId: v.id('users'),
    itemId: v.id('plaidItems'),
    accounts: v.array(linkedAccount),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) return null

    const candidates = await institutionAccounts(ctx, args.userId, item)
    for (const acct of args.accounts) {
      await upsertLinkedAccount(ctx, {
        userId: args.userId,
        itemId: args.itemId,
        account: acct,
        candidates,
      })
    }
    await ctx.db.patch(args.itemId, { lastSyncedAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.netWorth.snapshotUser, {
      userId: args.userId,
    })
    return null
  },
})

export const applyTransactionSyncPage = internalMutation({
  args: {
    userId: v.id('users'),
    itemId: v.id('plaidItems'),
    added: v.array(syncedTransaction),
    modified: v.array(syncedTransaction),
    removed: v.array(v.object({ transaction_id: v.string() })),
    nextCursor: v.string(),
    hasMore: v.boolean(),
  },
  returns: v.object({
    added: v.number(),
    modified: v.number(),
    removed: v.number(),
  }),
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()
    const byPlaidId = new Map(accounts.map((a) => [a.plaidAccountId, a._id]))

    let added = 0
    let modified = 0
    let removed = 0

    for (const raw of args.added) {
      const plaidTransactionId = raw.transaction_id
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) =>
          q.eq('plaidTransactionId', plaidTransactionId),
        )
        .unique()
      if (existing) continue

      const accountId = byPlaidId.get(raw.account_id)
      if (!accountId) continue

      const pfc = raw.personal_finance_category
      const fields = {
        merchantName: raw.merchant_name,
        originalDescription:
          raw.original_description || raw.name || 'Transaction',
        accountId,
        amount: raw.amount,
        plaidCategoryPrimary: pfc?.primary ?? null,
      }
      const resolved = await resolveCategory(ctx, args.userId, fields)
      const isTransfer = looksLikeTransfer({
        ...fields,
        plaidCategoryDetailed: pfc?.detailed,
      })

      const pendingId = raw.pending_transaction_id
      if (pendingId) {
        const pending = await ctx.db
          .query('transactions')
          .withIndex('by_pending_transaction_id', (q) =>
            q.eq('pendingTransactionId', pendingId),
          )
          .first()
        if (pending) {
          await ctx.db.delete(pending._id)
        }
        const byPlaidPending = await ctx.db
          .query('transactions')
          .withIndex('by_plaid_transaction_id', (q) =>
            q.eq('plaidTransactionId', pendingId),
          )
          .unique()
        if (byPlaidPending) await ctx.db.delete(byPlaidPending._id)
      }

      await ctx.db.insert('transactions', {
        userId: args.userId,
        accountId,
        plaidTransactionId,
        date: raw.date,
        authorizedDate: raw.authorized_date ?? undefined,
        amount: raw.amount,
        isoCurrency: raw.iso_currency_code || 'USD',
        merchantName: resolved.merchantName,
        originalDescription: fields.originalDescription,
        pending: raw.pending,
        pendingTransactionId: pendingId ?? undefined,
        categoryId: resolved.categoryId,
        categorySource: resolved.categorySource,
        plaidCategoryPrimary: pfc?.primary,
        plaidCategoryDetailed: pfc?.detailed,
        isTransfer,
        isHidden: false,
      })

      if (resolved.ruleId) {
        const rule = await ctx.db.get(resolved.ruleId)
        if (rule) {
          await ctx.db.patch(resolved.ruleId, {
            timesApplied: rule.timesApplied + 1,
          })
        }
      }
      added++
    }

    for (const raw of args.modified) {
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) =>
          q.eq('plaidTransactionId', raw.transaction_id),
        )
        .unique()
      if (!existing) continue

      const accountId = byPlaidId.get(raw.account_id) ?? existing.accountId
      const pfc = raw.personal_finance_category
      const originalDescription =
        raw.original_description || raw.name || existing.originalDescription

      if (existing.categorySource === 'user') {
        await ctx.db.patch(existing._id, {
          accountId,
          date: raw.date,
          authorizedDate: raw.authorized_date ?? undefined,
          amount: raw.amount,
          isoCurrency: raw.iso_currency_code || 'USD',
          originalDescription,
          pending: raw.pending,
          plaidCategoryPrimary: pfc?.primary,
          plaidCategoryDetailed: pfc?.detailed,
        })
      } else {
        const fields = {
          merchantName: raw.merchant_name ?? existing.merchantName,
          originalDescription,
          accountId,
          amount: raw.amount,
          plaidCategoryPrimary: pfc?.primary ?? null,
        }
        const resolved = await resolveCategory(ctx, args.userId, fields)
        await ctx.db.patch(existing._id, {
          accountId,
          date: raw.date,
          authorizedDate: raw.authorized_date ?? undefined,
          amount: raw.amount,
          isoCurrency: raw.iso_currency_code || 'USD',
          originalDescription,
          pending: raw.pending,
          plaidCategoryPrimary: pfc?.primary,
          plaidCategoryDetailed: pfc?.detailed,
          categoryId: resolved.categoryId,
          categorySource: resolved.categorySource,
          merchantName: resolved.merchantName,
          isTransfer: looksLikeTransfer({
            ...fields,
            plaidCategoryDetailed: pfc?.detailed,
          }),
        })
      }
      modified++
    }

    for (const rem of args.removed) {
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) =>
          q.eq('plaidTransactionId', rem.transaction_id),
        )
        .unique()
      if (existing) {
        await ctx.db.delete(existing._id)
        removed++
      }
    }

    // Persist cursor only after full page processed
    await ctx.db.patch(args.itemId, {
      syncCursor: args.nextCursor,
      lastSyncedAt: Date.now(),
      status: 'ok',
      errorCode: undefined,
      errorMessage: undefined,
    })

    return { added, modified, removed }
  },
})

export const markItemStatus = internalMutation({
  args: {
    itemId: v.id('plaidItems'),
    status: v.union(
      v.literal('ok'),
      v.literal('login_required'),
      v.literal('error'),
    ),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      status: args.status,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
    })
    return null
  },
})

export const updateLiabilities = internalMutation({
  args: {
    liabilities: v.array(
      v.object({
        plaidAccountId: v.string(),
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
        isOverdue: v.boolean(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const liab of args.liabilities) {
      const acct = await ctx.db
        .query('accounts')
        .withIndex('by_plaid_account_id', (q) =>
          q.eq('plaidAccountId', liab.plaidAccountId),
        )
        .unique()
      if (!acct) continue
      await ctx.db.patch(acct._id, {
        lastStatementBalance: liab.lastStatementBalance,
        lastStatementDate: liab.lastStatementDate,
        nextPaymentDueDate: liab.nextPaymentDueDate,
        minimumPayment: liab.minimumPayment,
        aprs: liab.aprs,
        isOverdue: liab.isOverdue,
      })
    }
    return null
  },
})

export const upsertHoldings = internalMutation({
  args: {
    userId: v.id('users'),
    itemId: v.id('plaidItems'),
    holdings: v.array(
      v.object({
        plaidAccountId: v.string(),
        plaidSecurityId: v.string(),
        symbol: v.optional(v.string()),
        name: v.string(),
        type: v.optional(v.string()),
        closePrice: v.optional(v.number()),
        closePriceAt: v.optional(v.string()),
        quantity: v.number(),
        costBasis: v.optional(v.number()),
        institutionValue: v.number(),
        institutionPrice: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const kept = new Set<string>()
    for (const h of args.holdings) {
      const account = await ctx.db
        .query('accounts')
        .withIndex('by_plaid_account_id', (q) =>
          q.eq('plaidAccountId', h.plaidAccountId),
        )
        .unique()
      if (!account) continue

      let security = await ctx.db
        .query('securities')
        .withIndex('by_plaid_security_id', (q) =>
          q.eq('plaidSecurityId', h.plaidSecurityId),
        )
        .unique()
      if (security) {
        await ctx.db.patch(security._id, {
          symbol: h.symbol,
          name: h.name,
          type: h.type,
          closePrice: h.closePrice,
          closePriceAt: h.closePriceAt,
        })
      } else {
        const securityId = await ctx.db.insert('securities', {
          plaidSecurityId: h.plaidSecurityId,
          symbol: h.symbol,
          name: h.name,
          type: h.type,
          closePrice: h.closePrice,
          closePriceAt: h.closePriceAt,
        })
        security = await ctx.db.get(securityId)
      }
      if (!security) continue

      const existing = await ctx.db
        .query('holdings')
        .withIndex('by_account_security', (q) =>
          q.eq('accountId', account._id).eq('securityId', security._id),
        )
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, {
          quantity: h.quantity,
          costBasis: h.costBasis,
          institutionValue: h.institutionValue,
          institutionPrice: h.institutionPrice,
        })
        kept.add(existing._id)
      } else {
        const holdingId = await ctx.db.insert('holdings', {
          userId: args.userId,
          accountId: account._id,
          securityId: security._id,
          quantity: h.quantity,
          costBasis: h.costBasis,
          institutionValue: h.institutionValue,
          institutionPrice: h.institutionPrice,
        })
        kept.add(holdingId)
      }
    }

    const itemAccounts = await ctx.db
      .query('accounts')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect()
    for (const account of itemAccounts) {
      if (account.type !== 'investment') continue
      const existing = await ctx.db
        .query('holdings')
        .withIndex('by_account', (q) => q.eq('accountId', account._id))
        .collect()
      for (const holding of existing) {
        if (!kept.has(holding._id)) await ctx.db.delete(holding._id)
      }
    }

    await writeInvestmentSnapshot(ctx, args.userId)
    return null
  },
})

export const listItemsNeedingSync = internalQuery({
  args: {},
  returns: v.array(v.id('plaidItems')),
  handler: async (ctx) => {
    const items = await ctx.db.query('plaidItems').collect()
    return items.filter((i) => i.status !== 'error').map((i) => i._id)
  },
})
