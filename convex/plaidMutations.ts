import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, internalQuery } from './_generated/server'
import { writeInvestmentSnapshot } from './lib/investmentSnapshots'
import {
  currentMarkPrice,
  markValue,
  normalizeSymbol,
  reconcileHolding,
  resetMarketStateIfTickerChanged,
} from './lib/market'
import { looksLikeTransfer, resolveCategory } from './lib/rules'

const accountType = v.union(
  v.literal('depository'),
  v.literal('credit'),
  v.literal('investment'),
  v.literal('loan'),
  v.literal('other'),
)

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
    accounts: v.array(
      v.object({
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
      }),
    ),
  },
  returns: v.id('plaidItems'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('plaidItems')
      .withIndex('by_plaid_item_id', (q) =>
        q.eq('plaidItemId', args.plaidItemId),
      )
      .unique()

    let itemId = existing?._id
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
    }

    for (const acct of args.accounts) {
      const existingAcct = await ctx.db
        .query('accounts')
        .withIndex('by_plaid_account_id', (q) =>
          q.eq('plaidAccountId', acct.plaidAccountId),
        )
        .unique()

      if (existingAcct) {
        await ctx.db.patch(existingAcct._id, {
          name: acct.name,
          officialName: acct.officialName,
          mask: acct.mask,
          type: acct.type,
          subtype: acct.subtype,
          currentBalance: acct.currentBalance,
          availableBalance: acct.availableBalance,
          limit: acct.limit,
          isoCurrency: acct.isoCurrency,
          itemId,
        })
      } else {
        await ctx.db.insert('accounts', {
          userId: args.userId,
          itemId,
          plaidAccountId: acct.plaidAccountId,
          name: acct.name,
          officialName: acct.officialName,
          mask: acct.mask,
          type: acct.type,
          subtype: acct.subtype,
          currentBalance: acct.currentBalance,
          availableBalance: acct.availableBalance,
          limit: acct.limit,
          isoCurrency: acct.isoCurrency,
          isHidden: false,
          isClosed: false,
        })
      }
    }

    await ctx.scheduler.runAfter(0, internal.netWorth.snapshotUser, {
      userId: args.userId,
    })
    return itemId
  },
})

export const upsertAccounts = internalMutation({
  args: {
    userId: v.id('users'),
    itemId: v.id('plaidItems'),
    accounts: v.array(
      v.object({
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
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const acct of args.accounts) {
      const existing = await ctx.db
        .query('accounts')
        .withIndex('by_plaid_account_id', (q) =>
          q.eq('plaidAccountId', acct.plaidAccountId),
        )
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: acct.name,
          officialName: acct.officialName,
          currentBalance: acct.currentBalance,
          availableBalance: acct.availableBalance,
          limit: acct.limit,
          subtype: acct.subtype,
        })
      } else {
        await ctx.db.insert('accounts', {
          userId: args.userId,
          itemId: args.itemId,
          ...acct,
          isHidden: false,
          isClosed: false,
        })
      }
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
    const now = Date.now()
    const alpacaSymbol = (raw?: string) => normalizeSymbol(raw) ?? undefined
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
      const nextAlpaca = alpacaSymbol(h.symbol)
      const symbolFields = {
        symbol: h.symbol,
        alpacaSymbol: nextAlpaca,
        name: h.name,
        type: h.type,
        closePrice: h.closePrice,
        closePriceAt: h.closePriceAt,
        ...(security
          ? resetMarketStateIfTickerChanged({
              previousSymbol: normalizeSymbol(
                security.alpacaSymbol ?? security.symbol,
              ),
              nextSymbol: nextAlpaca,
            })
          : {}),
      }
      if (security) {
        await ctx.db.patch(security._id, symbolFields)
      } else {
        const securityId = await ctx.db.insert('securities', {
          plaidSecurityId: h.plaidSecurityId,
          ...symbolFields,
        })
        security = await ctx.db.get(securityId)
      }
      if (!security) continue
      security = (await ctx.db.get(security._id)) ?? security

      const existing = await ctx.db
        .query('holdings')
        .withIndex('by_account_security', (q) =>
          q.eq('accountId', account._id).eq('securityId', security._id),
        )
        .unique()

      const livePrice = currentMarkPrice({
        livePrice: security.livePrice,
        closePrice: security.closePrice,
        institutionPrice: h.institutionPrice,
      })
      const plaidFields = {
        quantity: h.quantity,
        costBasis: h.costBasis,
        institutionValue: h.institutionValue,
        institutionPrice: h.institutionPrice,
        lastPlaidQuantity: h.quantity,
        lastPlaidValue: h.institutionValue,
        lastPlaidPrice: h.institutionPrice,
        lastPlaidSyncedAt: now,
      }

      if (existing) {
        const previousMarkValue = markValue(
          existing.quantity,
          currentMarkPrice({
            livePrice: security.livePrice,
            closePrice: security.closePrice,
            institutionPrice: existing.institutionPrice,
          }),
          existing.institutionValue,
        )
        const rec = reconcileHolding({
          previousQuantity: existing.quantity,
          previousMarkValue,
          plaidQuantity: h.quantity,
          plaidValue: h.institutionValue,
          livePrice,
        })
        await ctx.db.patch(existing._id, {
          ...plaidFields,
          lastReconcileDelta: rec.valueDelta,
          lastReconcileAt: now,
        })
        if (
          Math.abs(rec.quantityDelta) > 1e-8 ||
          Math.abs(rec.valueDelta) > 0.01
        ) {
          await ctx.db.insert('holdingReconciles', {
            userId: args.userId,
            holdingId: existing._id,
            accountId: account._id,
            securityId: security._id,
            plaidQuantity: h.quantity,
            plaidValue: h.institutionValue,
            plaidPrice: h.institutionPrice,
            previousQuantity: existing.quantity,
            previousMarkValue,
            quantityDelta: rec.quantityDelta,
            valueDelta: rec.valueDelta,
            markPrice: livePrice,
            priceDrift: rec.priceDrift,
            reconciledAt: now,
          })
        }
        kept.add(existing._id)
      } else {
        const holdingId = await ctx.db.insert('holdings', {
          userId: args.userId,
          accountId: account._id,
          securityId: security._id,
          ...plaidFields,
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
        if (kept.has(holding._id)) continue
        const recs = await ctx.db
          .query('holdingReconciles')
          .withIndex('by_holding', (q) => q.eq('holdingId', holding._id))
          .collect()
        for (const rec of recs) {
          await ctx.db.delete(rec._id)
        }
        await ctx.db.delete(holding._id)
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
