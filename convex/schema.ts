import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const accountType = v.union(
  v.literal('depository'),
  v.literal('credit'),
  v.literal('investment'),
  v.literal('loan'),
  v.literal('other'),
)

const itemStatus = v.union(
  v.literal('ok'),
  v.literal('login_required'),
  v.literal('error'),
)

const categorySource = v.union(
  v.literal('plaid'),
  v.literal('rule'),
  v.literal('user'),
)

const budgetType = v.union(
  v.literal('fixed'),
  v.literal('flex'),
  v.literal('non_monthly'),
  v.literal('income'),
  v.literal('transfer'),
)

const manualAssetType = v.union(
  v.literal('property'),
  v.literal('vehicle'),
  v.literal('cash'),
  v.literal('other'),
  v.literal('debt'),
)

const cadence = v.union(
  v.literal('weekly'),
  v.literal('biweekly'),
  v.literal('monthly'),
  v.literal('quarterly'),
  v.literal('yearly'),
)

const ruleMatcher = v.object({
  merchantName: v.optional(v.string()),
  descriptionContains: v.optional(v.string()),
  plaidCategory: v.optional(v.string()),
  accountId: v.optional(v.id('accounts')),
  amountMin: v.optional(v.number()),
  amountMax: v.optional(v.number()),
})

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    categoriesSeeded: v.boolean(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  plaidItems: defineTable({
    userId: v.id('users'),
    plaidItemId: v.string(),
    accessToken: v.string(),
    institutionId: v.optional(v.string()),
    institutionName: v.string(),
    status: itemStatus,
    syncCursor: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    consentExpiresAt: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    excludedPlaidAccountIds: v.optional(v.array(v.string())),
  })
    .index('by_user', ['userId'])
    .index('by_plaid_item_id', ['plaidItemId']),

  accounts: defineTable({
    userId: v.id('users'),
    itemId: v.id('plaidItems'),
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
    isHidden: v.boolean(),
    isClosed: v.boolean(),
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
    isOverdue: v.optional(v.boolean()),
  })
    .index('by_user', ['userId'])
    .index('by_item', ['itemId'])
    .index('by_plaid_account_id', ['plaidAccountId'])
    .index('by_user_type', ['userId', 'type']),

  categories: defineTable({
    userId: v.optional(v.id('users')),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    parentId: v.optional(v.id('categories')),
    isSystem: v.boolean(),
    budgetType: budgetType,
    excludeFromBudget: v.boolean(),
    plaidPrimary: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'name'])
    .index('by_plaid_primary', ['userId', 'plaidPrimary']),

  transactions: defineTable({
    userId: v.id('users'),
    accountId: v.id('accounts'),
    plaidTransactionId: v.string(),
    date: v.string(),
    authorizedDate: v.optional(v.string()),
    amount: v.number(),
    isoCurrency: v.string(),
    merchantName: v.optional(v.string()),
    originalDescription: v.string(),
    pending: v.boolean(),
    pendingTransactionId: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    categorySource: categorySource,
    plaidCategoryPrimary: v.optional(v.string()),
    plaidCategoryDetailed: v.optional(v.string()),
    isTransfer: v.boolean(),
    isHidden: v.boolean(),
    isSplit: v.optional(v.boolean()),
    parentTransactionId: v.optional(v.id('transactions')),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_account_date', ['accountId', 'date'])
    .index('by_plaid_transaction_id', ['plaidTransactionId'])
    .index('by_user_category_date', ['userId', 'categoryId', 'date'])
    .index('by_pending_transaction_id', ['pendingTransactionId'])
    .index('by_user_merchant', ['userId', 'merchantName']),

  categoryRules: defineTable({
    userId: v.id('users'),
    matcher: ruleMatcher,
    categoryId: v.id('categories'),
    merchantRename: v.optional(v.string()),
    priority: v.number(),
    createdFrom: v.union(v.literal('correction'), v.literal('manual')),
    timesApplied: v.number(),
    isActive: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_account', ['userId', 'matcher.accountId']),

  budgets: defineTable({
    userId: v.id('users'),
    month: v.string(),
    expectedIncome: v.optional(v.number()),
    flexBudget: v.optional(v.number()),
  }).index('by_user_month', ['userId', 'month']),

  budgetItems: defineTable({
    budgetId: v.id('budgets'),
    categoryId: v.id('categories'),
    amount: v.number(),
    rollover: v.optional(v.boolean()),
  })
    .index('by_budget', ['budgetId'])
    .index('by_budget_category', ['budgetId', 'categoryId']),

  netWorthSnapshots: defineTable({
    userId: v.id('users'),
    date: v.string(),
    netWorth: v.number(),
    assets: v.number(),
    liabilities: v.number(),
    byAccount: v.array(
      v.object({
        accountId: v.id('accounts'),
        balance: v.number(),
      }),
    ),
  }).index('by_user_date', ['userId', 'date']),

  investmentSnapshots: defineTable({
    userId: v.id('users'),
    date: v.string(),
    totalValue: v.number(),
    byAccount: v.array(
      v.object({
        accountId: v.id('accounts'),
        value: v.number(),
      }),
    ),
    byHolding: v.array(
      v.object({
        holdingId: v.id('holdings'),
        accountId: v.id('accounts'),
        securityId: v.id('securities'),
        value: v.number(),
      }),
    ),
  }).index('by_user_date', ['userId', 'date']),

  manualAssets: defineTable({
    userId: v.id('users'),
    name: v.string(),
    type: manualAssetType,
    value: v.number(),
    valueUpdatedAt: v.number(),
  }).index('by_user', ['userId']),

  securities: defineTable({
    plaidSecurityId: v.string(),
    symbol: v.optional(v.string()),
    name: v.string(),
    type: v.optional(v.string()),
    closePrice: v.optional(v.number()),
    closePriceAt: v.optional(v.string()),
  }).index('by_plaid_security_id', ['plaidSecurityId']),

  holdings: defineTable({
    userId: v.id('users'),
    accountId: v.id('accounts'),
    securityId: v.id('securities'),
    quantity: v.number(),
    costBasis: v.optional(v.number()),
    institutionValue: v.number(),
    institutionPrice: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_account', ['accountId'])
    .index('by_account_security', ['accountId', 'securityId']),

  investmentTxns: defineTable({
    userId: v.id('users'),
    accountId: v.id('accounts'),
    plaidInvestmentTransactionId: v.string(),
    date: v.string(),
    type: v.string(),
    subtype: v.optional(v.string()),
    quantity: v.optional(v.number()),
    price: v.optional(v.number()),
    amount: v.number(),
    securityId: v.optional(v.id('securities')),
    name: v.optional(v.string()),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_plaid_id', ['plaidInvestmentTransactionId'])
    .index('by_account', ['accountId']),

  recurringStreams: defineTable({
    userId: v.id('users'),
    merchantName: v.string(),
    categoryId: v.optional(v.id('categories')),
    cadence: cadence,
    averageAmount: v.number(),
    lastDate: v.string(),
    nextExpectedDate: v.optional(v.string()),
    isActive: v.boolean(),
    isSubscription: v.boolean(),
    mutedByUser: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_merchant', ['userId', 'merchantName']),
})
