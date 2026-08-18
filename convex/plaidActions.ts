'use node'

import { v } from 'convex/values'
import { CountryCode, Products } from 'plaid'
import type { Transaction as PlaidTransaction } from 'plaid'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalAction } from './_generated/server'
import {
  getPlaidClient,
  getPlaidWebhookUrl,
  isPlaidLoginRequired,
  plaidErrorCode,
} from './lib/plaidClient'

const CONSENTED_PRODUCTS: Products[] = [
  Products.Investments,
  Products.Liabilities,
]

function mapAccountType(
  type: string | null | undefined,
): 'depository' | 'credit' | 'investment' | 'loan' | 'other' {
  switch (type) {
    case 'depository':
    case 'credit':
    case 'investment':
    case 'loan':
      return type
    default:
      return 'other'
  }
}

function serializeTxn(t: PlaidTransaction) {
  return {
    transaction_id: t.transaction_id,
    account_id: t.account_id,
    amount: t.amount,
    date: t.date,
    authorized_date: t.authorized_date ?? null,
    name: t.name,
    merchant_name: t.merchant_name ?? null,
    original_description: t.original_description ?? t.name,
    pending: t.pending,
    pending_transaction_id: t.pending_transaction_id ?? null,
    iso_currency_code: t.iso_currency_code ?? 'USD',
    personal_finance_category: t.personal_finance_category
      ? {
          primary: t.personal_finance_category.primary,
          detailed: t.personal_finance_category.detailed,
        }
      : null,
  }
}

export const createLinkToken = action({
  args: {
    products: v.optional(
      v.array(
        v.union(
          v.literal('transactions'),
          v.literal('liabilities'),
          v.literal('investments'),
        ),
      ),
    ),
  },
  returns: v.object({ linkToken: v.string() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const userId = await ctx.runQuery(
      internal.plaidMutations.getUserByClerkId,
      {
        clerkId: identity.subject,
      },
    )
    if (!userId)
      throw new Error('User not ready — call users.ensureReady first')

    const client = getPlaidClient()
    const products = (args.products ?? ['transactions']).map(
      (p) => p as Products,
    )
    const additional = CONSENTED_PRODUCTS.filter((p) => !products.includes(p))
    const webhook = getPlaidWebhookUrl()

    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Bud',
      products,
      additional_consented_products: additional,
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook,
    })

    return { linkToken: response.data.link_token }
  },
})

export const createUpdateLinkToken = action({
  args: { itemId: v.id('plaidItems') },
  returns: v.object({ linkToken: v.string() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const item = await ctx.runQuery(internal.plaidMutations.getItemInternal, {
      itemId: args.itemId,
    })
    if (!item) throw new Error('Item not found')

    const client = getPlaidClient()
    const webhook = getPlaidWebhookUrl()
    const response = await client.linkTokenCreate({
      user: { client_user_id: item.userId },
      client_name: 'Bud',
      country_codes: [CountryCode.Us],
      language: 'en',
      access_token: item.accessToken,
      additional_consented_products: CONSENTED_PRODUCTS,
      webhook,
    })
    return { linkToken: response.data.link_token }
  },
})

export const exchangePublicToken = action({
  args: {
    publicToken: v.string(),
    institutionId: v.optional(v.string()),
    institutionName: v.string(),
  },
  returns: v.object({ itemId: v.id('plaidItems') }),
  handler: async (ctx, args): Promise<{ itemId: Id<'plaidItems'> }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const userId: Id<'users'> | null = await ctx.runQuery(
      internal.plaidMutations.getUserByClerkId,
      { clerkId: identity.subject },
    )
    if (!userId) throw new Error('User not ready')

    const client = getPlaidClient()
    const exchange = await client.itemPublicTokenExchange({
      public_token: args.publicToken,
    })
    const accessToken = exchange.data.access_token
    const plaidItemId = exchange.data.item_id

    const accountsRes = await client.accountsGet({ access_token: accessToken })
    const accounts = accountsRes.data.accounts.map((a) => ({
      plaidAccountId: a.account_id,
      name: a.name,
      officialName: a.official_name ?? undefined,
      mask: a.mask ?? undefined,
      type: mapAccountType(a.type),
      subtype: a.subtype ?? undefined,
      currentBalance: a.balances.current ?? 0,
      availableBalance: a.balances.available ?? undefined,
      limit: a.balances.limit ?? undefined,
      isoCurrency: a.balances.iso_currency_code ?? 'USD',
    }))

    const itemId: Id<'plaidItems'> = await ctx.runMutation(
      internal.plaidMutations.storeItemAndAccounts,
      {
        userId,
        plaidItemId,
        accessToken,
        institutionId: args.institutionId,
        institutionName: args.institutionName,
        accounts,
      },
    )

    await ctx.scheduler.runAfter(0, internal.plaidActions.syncItem, { itemId })
    return { itemId }
  },
})

export const syncItem = internalAction({
  args: {
    itemId: v.id('plaidItems'),
    holdingsAttempt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.plaidMutations.getItemInternal, {
      itemId: args.itemId,
    })
    if (!item) return null

    const client = getPlaidClient()
    const holdingsAttempt = args.holdingsAttempt ?? 0

    try {
      const accountsRes = await client.accountsGet({
        access_token: item.accessToken,
      })
      await ctx.runMutation(internal.plaidMutations.upsertAccounts, {
        userId: item.userId,
        itemId: item._id,
        accounts: accountsRes.data.accounts.map((a) => ({
          plaidAccountId: a.account_id,
          name: a.name,
          officialName: a.official_name ?? undefined,
          mask: a.mask ?? undefined,
          type: mapAccountType(a.type),
          subtype: a.subtype ?? undefined,
          currentBalance: a.balances.current ?? 0,
          availableBalance: a.balances.available ?? undefined,
          limit: a.balances.limit ?? undefined,
          isoCurrency: a.balances.iso_currency_code ?? 'USD',
        })),
      })

      if (holdingsAttempt === 0) {
        try {
          let cursor = item.syncCursor
          let hasMore = true
          while (hasMore) {
            const syncRes = await client.transactionsSync({
              access_token: item.accessToken,
              cursor: cursor || undefined,
              count: 100,
            })
            const data = syncRes.data
            await ctx.runMutation(
              internal.plaidMutations.applyTransactionSyncPage,
              {
                userId: item.userId,
                itemId: item._id,
                added: data.added.map(serializeTxn),
                modified: data.modified.map(serializeTxn),
                removed: data.removed.map((r) => ({
                  transaction_id: r.transaction_id,
                })),
                nextCursor: data.next_cursor,
                hasMore: data.has_more,
              },
            )
            cursor = data.next_cursor
            hasMore = data.has_more
          }
        } catch (err) {
          if (isPlaidLoginRequired(err)) throw err
          console.error('Transaction sync skipped', plaidErrorCode(err), err)
        }

        try {
          const liab = await client.liabilitiesGet({
            access_token: item.accessToken,
          })
          const credit = liab.data.liabilities.credit ?? []
          await ctx.runMutation(internal.plaidMutations.updateLiabilities, {
            liabilities: credit.map((c) => ({
              plaidAccountId: c.account_id ?? '',
              lastStatementBalance: c.last_statement_balance ?? undefined,
              lastStatementDate: c.last_statement_issue_date ?? undefined,
              nextPaymentDueDate: c.next_payment_due_date ?? undefined,
              minimumPayment: c.minimum_payment_amount ?? undefined,
              aprs: c.aprs.map((a) => ({
                aprPercentage: a.apr_percentage,
                aprType: a.apr_type,
              })),
              isOverdue: c.is_overdue === true,
            })),
          })
        } catch {
          // Institution may not support liabilities
        }
      }

      const hasInvestment = accountsRes.data.accounts.some(
        (a) => mapAccountType(a.type) === 'investment',
      )
      if (hasInvestment) {
        try {
          const holdings = await client.investmentsHoldingsGet({
            access_token: item.accessToken,
          })
          const securitiesById = new Map(
            holdings.data.securities.map((s) => [s.security_id, s]),
          )
          await ctx.runMutation(internal.plaidMutations.upsertHoldings, {
            userId: item.userId,
            itemId: item._id,
            holdings: holdings.data.holdings.map((h) => {
              const sec = securitiesById.get(h.security_id)
              return {
                plaidAccountId: h.account_id,
                plaidSecurityId: h.security_id,
                symbol: sec?.ticker_symbol ?? undefined,
                name: sec?.name ?? 'Security',
                type: sec?.type ?? undefined,
                closePrice: sec?.close_price ?? undefined,
                closePriceAt: sec?.close_price_as_of ?? undefined,
                quantity: h.quantity,
                costBasis: h.cost_basis ?? undefined,
                institutionValue: h.institution_value,
                institutionPrice: h.institution_price,
              }
            }),
          })
          await ctx.scheduler.runAfter(
            0,
            internal.alpacaActions.refreshForUser,
            {
              userId: item.userId,
              backfill: true,
            },
          )
        } catch (err) {
          const code = plaidErrorCode(err)
          if (code === 'PRODUCT_NOT_READY' && holdingsAttempt < 3) {
            await ctx.scheduler.runAfter(
              30_000 * (holdingsAttempt + 1),
              internal.plaidActions.syncItem,
              {
                itemId: args.itemId,
                holdingsAttempt: holdingsAttempt + 1,
              },
            )
          } else if (
            code !== 'PRODUCTS_NOT_SUPPORTED' &&
            code !== 'NO_INVESTMENT_ACCOUNTS'
          ) {
            console.error('Investments sync failed', code, err)
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      const loginRequired = isPlaidLoginRequired(err)
      await ctx.runMutation(internal.plaidMutations.markItemStatus, {
        itemId: item._id,
        status: loginRequired ? 'login_required' : 'error',
        errorCode: loginRequired
          ? 'ITEM_LOGIN_REQUIRED'
          : (plaidErrorCode(err) ?? 'SYNC_ERROR'),
        errorMessage: message,
      })
    }

    return null
  },
})

export const syncItemForUser = action({
  args: { itemId: v.id('plaidItems') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await ctx.runAction(internal.plaidActions.syncItem, { itemId: args.itemId })
    return null
  },
})

export const syncAllItems = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const itemIds = await ctx.runQuery(
      internal.plaidMutations.listItemsNeedingSync,
      {},
    )
    for (const itemId of itemIds) {
      await ctx.scheduler.runAfter(0, internal.plaidActions.syncItem, {
        itemId,
      })
    }
    return null
  },
})

export const handleWebhook = internalAction({
  args: {
    webhookType: v.string(),
    webhookCode: v.string(),
    itemId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.plaidMutations.getItemByPlaidId, {
      plaidItemId: args.itemId,
    })
    if (!item) return null

    if (
      (args.webhookType === 'TRANSACTIONS' &&
        (args.webhookCode === 'SYNC_UPDATES_AVAILABLE' ||
          args.webhookCode === 'DEFAULT_UPDATE' ||
          args.webhookCode === 'INITIAL_UPDATE' ||
          args.webhookCode === 'HISTORICAL_UPDATE')) ||
      ((args.webhookType === 'HOLDINGS' ||
        args.webhookType === 'INVESTMENTS_TRANSACTIONS') &&
        (args.webhookCode === 'DEFAULT_UPDATE' ||
          args.webhookCode === 'HISTORICAL_UPDATE'))
    ) {
      await ctx.scheduler.runAfter(0, internal.plaidActions.syncItem, {
        itemId: item._id,
      })
    }

    if (args.webhookType === 'ITEM' && args.webhookCode === 'ERROR') {
      await ctx.runMutation(internal.plaidMutations.markItemStatus, {
        itemId: item._id,
        status: 'login_required',
        errorCode: 'ITEM_LOGIN_REQUIRED',
        errorMessage: 'Plaid item requires re-authentication',
      })
    }

    return null
  },
})
