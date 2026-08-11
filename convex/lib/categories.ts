import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type SeedCategory = {
  name: string
  icon: string
  color: string
  budgetType: 'fixed' | 'flex' | 'non_monthly' | 'income' | 'transfer'
  excludeFromBudget: boolean
  plaidPrimary?: string
  children?: Array<Omit<SeedCategory, 'children'>>
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    name: 'Income',
    icon: 'wallet',
    color: '#2f6a4a',
    budgetType: 'income',
    excludeFromBudget: true,
    plaidPrimary: 'INCOME',
    children: [
      {
        name: 'Paycheck',
        icon: 'banknote',
        color: '#2f6a4a',
        budgetType: 'income',
        excludeFromBudget: true,
      },
      {
        name: 'Interest',
        icon: 'trending-up',
        color: '#2f6a4a',
        budgetType: 'income',
        excludeFromBudget: true,
      },
    ],
  },
  {
    name: 'Transfer',
    icon: 'arrow-left-right',
    color: '#6b7280',
    budgetType: 'transfer',
    excludeFromBudget: true,
    plaidPrimary: 'TRANSFER_IN',
    children: [
      {
        name: 'Credit Card Payment',
        icon: 'credit-card',
        color: '#6b7280',
        budgetType: 'transfer',
        excludeFromBudget: true,
      },
      {
        name: 'Transfer Out',
        icon: 'arrow-up-right',
        color: '#6b7280',
        budgetType: 'transfer',
        excludeFromBudget: true,
        plaidPrimary: 'TRANSFER_OUT',
      },
    ],
  },
  {
    name: 'Housing',
    icon: 'home',
    color: '#328f97',
    budgetType: 'fixed',
    excludeFromBudget: false,
    plaidPrimary: 'RENT_AND_UTILITIES',
    children: [
      {
        name: 'Rent / Mortgage',
        icon: 'home',
        color: '#328f97',
        budgetType: 'fixed',
        excludeFromBudget: false,
      },
      {
        name: 'Utilities',
        icon: 'zap',
        color: '#328f97',
        budgetType: 'fixed',
        excludeFromBudget: false,
      },
    ],
  },
  {
    name: 'Food & Drink',
    icon: 'utensils',
    color: '#c27803',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'FOOD_AND_DRINK',
    children: [
      {
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#c27803',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
      {
        name: 'Restaurants',
        icon: 'utensils',
        color: '#c27803',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
      {
        name: 'Coffee',
        icon: 'coffee',
        color: '#c27803',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
    ],
  },
  {
    name: 'Transportation',
    icon: 'car',
    color: '#2563eb',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'TRANSPORTATION',
    children: [
      {
        name: 'Gas',
        icon: 'fuel',
        color: '#2563eb',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
      {
        name: 'Transit',
        icon: 'train',
        color: '#2563eb',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
      {
        name: 'Rideshare',
        icon: 'car',
        color: '#2563eb',
        budgetType: 'flex',
        excludeFromBudget: false,
      },
    ],
  },
  {
    name: 'Shopping',
    icon: 'shopping-bag',
    color: '#7c3aed',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'GENERAL_MERCHANDISE',
  },
  {
    name: 'Entertainment',
    icon: 'clapperboard',
    color: '#db2777',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'ENTERTAINMENT',
  },
  {
    name: 'Health',
    icon: 'heart-pulse',
    color: '#e11d48',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'MEDICAL',
  },
  {
    name: 'Personal Care',
    icon: 'sparkles',
    color: '#0891b2',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'PERSONAL_CARE',
  },
  {
    name: 'Travel',
    icon: 'plane',
    color: '#0d9488',
    budgetType: 'non_monthly',
    excludeFromBudget: false,
    plaidPrimary: 'TRAVEL',
  },
  {
    name: 'Subscriptions',
    icon: 'repeat',
    color: '#4f46e5',
    budgetType: 'fixed',
    excludeFromBudget: false,
  },
  {
    name: 'Interest & Fees',
    icon: 'alert-circle',
    color: '#b45309',
    budgetType: 'fixed',
    excludeFromBudget: false,
    plaidPrimary: 'BANK_FEES',
  },
  {
    name: 'Insurance',
    icon: 'shield',
    color: '#475569',
    budgetType: 'fixed',
    excludeFromBudget: false,
  },
  {
    name: 'Uncategorized',
    icon: 'help-circle',
    color: '#94a3b8',
    budgetType: 'flex',
    excludeFromBudget: false,
    plaidPrimary: 'OTHER',
  },
]

export async function seedCategoriesForUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<void> {
  let order = 0
  for (const cat of DEFAULT_CATEGORIES) {
    const parentId = await ctx.db.insert('categories', {
      userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isSystem: true,
      budgetType: cat.budgetType,
      excludeFromBudget: cat.excludeFromBudget,
      plaidPrimary: cat.plaidPrimary,
      sortOrder: order++,
    })
    for (const child of cat.children ?? []) {
      await ctx.db.insert('categories', {
        userId,
        name: child.name,
        icon: child.icon,
        color: child.color,
        parentId,
        isSystem: true,
        budgetType: child.budgetType,
        excludeFromBudget: child.excludeFromBudget,
        plaidPrimary: child.plaidPrimary,
        sortOrder: order++,
      })
    }
  }
}

export async function findCategoryByPlaidPrimary(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  plaidPrimary?: string | null,
): Promise<Id<'categories'> | undefined> {
  if (!plaidPrimary) return undefined
  const match = await ctx.db
    .query('categories')
    .withIndex('by_plaid_primary', (q) =>
      q.eq('userId', userId).eq('plaidPrimary', plaidPrimary),
    )
    .first()
  if (match) return match._id

  // Fallback mappings for related Plaid primaries
  const aliases: Record<string, string> = {
    TRANSFER_IN: 'TRANSFER_IN',
    TRANSFER_OUT: 'TRANSFER_OUT',
    LOAN_PAYMENTS: 'TRANSFER_OUT',
  }
  const alias = aliases[plaidPrimary]
  if (alias && alias !== plaidPrimary) {
    const aliased = await ctx.db
      .query('categories')
      .withIndex('by_plaid_primary', (q) =>
        q.eq('userId', userId).eq('plaidPrimary', alias),
      )
      .first()
    if (aliased) return aliased._id
  }

  const uncategorized = await ctx.db
    .query('categories')
    .withIndex('by_user_name', (q) =>
      q.eq('userId', userId).eq('name', 'Uncategorized'),
    )
    .first()
  return uncategorized?._id
}
